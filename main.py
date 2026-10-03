import os
import re
import json
import time
import io
from typing import Optional
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, Request, Response, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse, RedirectResponse
import httpx
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload

load_dotenv()

PORT = int(os.getenv("PORT", "3001"))
GOOGLE_CREDENTIALS_RAW = os.getenv("GOOGLE_CREDENTIALS")
DRIVE_IMAGE_FOLDER_ID = os.getenv("DRIVE_IMAGE_FOLDER_ID")

drive_service = None

if GOOGLE_CREDENTIALS_RAW:
    try:
        credentials_dict = json.loads(GOOGLE_CREDENTIALS_RAW)
        scopes = [
            "https://www.googleapis.com/auth/drive.readonly",
            "https://www.googleapis.com/auth/drive.file",
            "https://www.googleapis.com/auth/drive"
        ]
        creds = service_account.Credentials.from_service_account_info(
            credentials_dict, scopes=scopes
        )
        drive_service = build("drive", "v3", credentials=creds)
        print("Google Drive API initialized successfully.")
    except Exception as e:
        print(f"Failed to initialize Google Drive API: {e}")
else:
    print("GOOGLE_CREDENTIALS environment variable is not set. Drive links will fallback to direct streaming.")

# Direct URL cache to prevent repetitive scanning of >100MB files
# { video_id: {"direct_url": str, "cookies": dict, "expires_at": float} }
direct_url_cache = {}

# Async HTTP client pool for fast, low-latency video streaming
http_client: Optional[httpx.AsyncClient] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global http_client
    limits = httpx.Limits(max_keepalive_connections=100, max_connections=200, keepalive_expiry=60.0)
    http_client = httpx.AsyncClient(limits=limits, timeout=30.0, follow_redirects=True)
    yield
    await http_client.aclose()

app = FastAPI(title="MarkitPlayer Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def resolve_direct_google_url(video_id: str):
    cached = direct_url_cache.get(video_id)
    if cached and cached["expires_at"] > time.time():
        return cached

    initial_url = f"https://drive.google.com/uc?export=download&id={video_id}"
    headers = {"Range": "bytes=0-100"}

    # Use follow_redirects=False first to capture cookies and intermediate headers if needed
    resp = await http_client.get(initial_url, headers=headers)
    cookies = dict(resp.cookies)
    target_url = str(resp.url)

    # Check if Google returned virus scan warning page (>100MB files)
    content_type = resp.headers.get("content-type", "")
    if "text/html" in content_type:
        html = resp.text
        confirm_token = "t"
        confirm_match = re.search(r"confirm=([0-9A-Za-z_-]+)", html, re.IGNORECASE) or \
                        re.search(r'name="confirm"\s+value="([^"]+)"', html, re.IGNORECASE)
        if confirm_match:
            confirm_token = confirm_match.group(1)

        uuid_match = re.search(r'name="uuid"\s+value="([^"]+)"', html, re.IGNORECASE)
        action_match = re.search(r'<form[^>]*action="([^"]+)"', html, re.IGNORECASE)
        base_url = action_match.group(1) if action_match else "https://drive.usercontent.google.com/download"

        target_url = f"{base_url}?id={video_id}&export=download&confirm={confirm_token}"
        if uuid_match:
            target_url += f"&uuid={uuid_match.group(1)}"

    result = {
        "direct_url": target_url,
        "cookies": cookies,
        "expires_at": time.time() + (3 * 3600)
    }
    direct_url_cache[video_id] = result
    return result

@app.get("/")
async def root():
    return {"status": "ok", "message": "MarkitPlayer Backend is running"}

@app.get("/health")
async def health():
    return Response(content="OK", media_type="text/plain", status_code=200)

@app.get("/api/direct-url/{video_id}")
async def get_direct_url(video_id: str):
    try:
        resolved = await resolve_direct_google_url(video_id)
        return {"directUrl": resolved["direct_url"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/upload-image")
async def upload_image(image: UploadFile = File(...)):
    if not drive_service:
        raise HTTPException(status_code=500, detail="Google Drive API not configured")
    if not DRIVE_IMAGE_FOLDER_ID:
        raise HTTPException(status_code=500, detail="DRIVE_IMAGE_FOLDER_ID is not configured")

    try:
        content = await image.read()
        file_metadata = {
            "name": f"chat-img-{int(time.time() * 1000)}-{image.filename}",
            "parents": [DRIVE_IMAGE_FOLDER_ID]
        }
        media = MediaIoBaseUpload(io.BytesIO(content), mimetype=image.content_type, resumable=True)

        file_result = drive_service.files().create(
            body=file_metadata,
            media_body=media,
            fields="id, webViewLink, webContentLink"
        ).execute()

        # Set permission to public read
        drive_service.permissions().create(
            fileId=file_result["id"],
            body={"role": "reader", "type": "anyone"}
        ).execute()

        return {
            "id": file_result.get("id"),
            "url": file_result.get("webViewLink"),
            "downloadUrl": file_result.get("webContentLink")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/video/{video_id}")
async def stream_video(video_id: str, request: Request):
    try:
        resolved = await resolve_direct_google_url(video_id)
        target_url = resolved["direct_url"]
        cookies = resolved["cookies"]

        req_headers = {}
        client_range = request.headers.get("range")
        if client_range:
            req_headers["Range"] = client_range
        else:
            req_headers["Range"] = "bytes=0-"

        # Stream response from Google CDN
        upstream_req = http_client.build_request("GET", target_url, headers=req_headers, cookies=cookies)
        upstream_resp = await http_client.send(upstream_req, stream=True)

        resp_headers = {
            "Accept-Ranges": "bytes",
            "Cache-Control": "public, max-age=86400, immutable"
        }
        for h in ["content-type", "content-length", "content-range"]:
            if h in upstream_resp.headers:
                resp_headers[h] = upstream_resp.headers[h]

        async def stream_generator():
            try:
                async for chunk in upstream_resp.aiter_bytes():
                    yield chunk
            finally:
                await upstream_resp.aclose()

        return StreamingResponse(
            stream_generator(),
            status_code=upstream_resp.status_code,
            headers=resp_headers
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Proxy error: {str(e)}")

@app.get("/api/thumbnail/{video_id}")
async def get_thumbnail(video_id: str):
    if drive_service:
        try:
            file_info = drive_service.files().get(
                fileId=video_id,
                fields="thumbnailLink"
            ).execute()
            if "thumbnailLink" in file_info:
                thumb_url = re.sub(r"=s\d+$", "=s800", file_info["thumbnailLink"])
                return RedirectResponse(url=thumb_url)
        except Exception as e:
            print(f"Drive API thumbnail lookup failed: {e}")

    try:
        thumb_url = f"https://drive.google.com/thumbnail?id={video_id}&sz=w800-h600"
        upstream_resp = await http_client.get(thumb_url)
        headers = {
            "Content-Type": upstream_resp.headers.get("content-type", "image/jpeg"),
            "Cache-Control": "public, max-age=86400"
        }
        return Response(content=upstream_resp.content, status_code=upstream_resp.status_code, headers=headers)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Thumbnail proxy error: {str(e)}")

@app.get("/api/instagram")
async def proxy_instagram(url: str = Query(..., description="Instagram Post or Reel URL"), request: Request = None):
    try:
        import yt_dlp
        ydl_opts = {
            "format": "best",
            "quiet": True,
            "no_warnings": True,
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            video_url = info.get("url")

        if not video_url:
            raise HTTPException(status_code=404, detail="Video stream URL not found")

        req_headers = {}
        if request and request.headers.get("range"):
            req_headers["Range"] = request.headers.get("range")

        upstream_req = http_client.build_request("GET", video_url, headers=req_headers)
        upstream_resp = await http_client.send(upstream_req, stream=True)

        resp_headers = {
            "Accept-Ranges": "bytes",
        }
        for h in ["content-type", "content-length", "content-range"]:
            if h in upstream_resp.headers:
                resp_headers[h] = upstream_resp.headers[h]

        async def stream_generator():
            try:
                async for chunk in upstream_resp.aiter_bytes():
                    yield chunk
            finally:
                await upstream_resp.aclose()

        return StreamingResponse(
            stream_generator(),
            status_code=upstream_resp.status_code,
            headers=resp_headers
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Instagram proxy error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True)
