# MarkitPlayer: Azure & Cloudflare Deployment & Architecture Guide

This document preserves the architecture plan, cost calculations, and step-by-step setup discussed for switching to Azure and Cloudflare.

---

## 1. The Architecture Overview

```
[React Frontend] (Cloudflare Pages - Free Unlimited Bandwidth)
       │
       ├─► [Supabase] (Free Tier: Auth, PostgreSQL Database, Realtime Comments)
       │
       └─► [Video Streaming]
             ├─► Primary (0 MB Egress): Direct Google Drive CDN (`https://drive.google.com/uc?export=download&id=...`)
             └─► Fallback: Azure App Service / Cloudflare Worker Proxy (`/api/video/:id`)
```

---

## 2. Capacity & Cost on Free Tiers

* **Video Egress Cost:** **$0.00** (Unlimited via Google CDN + Cloudflare Edge Caching)
* **Storage Cost:** **$0.00** (Stored on video editors' own Google Drives)
* **Monthly Active Users (MAU):** **~5,000 to 10,000 users/month for $0**
* **Peak Live Concurrent Users:** **200 concurrent viewers** (Supabase Realtime Free Tier)

---

## 3. What To Do Right Now (While Waiting for Azure)

### A. Deploy Frontend to Cloudflare Pages (Free, 2 Mins)
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**.
2. Select repository: `ayushgatla/markitplayer`.
3. Settings:
   - **Framework preset:** `Vite`
   - **Root directory:** `my-app`
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
4. Add Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Click **Save and Deploy**.

### B. (Optional) Cloudflare Worker for Video Proxy
In Cloudflare Dashboard → **Workers & Pages** → **Create Worker** (`markit-video-proxy`):
```javascript
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
          'Access-Control-Allow-Headers': 'Range, Content-Type, Accept, Cache-Control, Pragma',
          'Access-Control-Max-Age': '86400',
        }
      });
    }

    const match = url.pathname.match(/\/api\/video\/([a-zA-Z0-9_-]+)/);
    if (!match) return new Response("Not found", { status: 404 });

    const videoId = match[1];

    // Enforce bounded chunks for large Google Drive files (>100MB)
    // Prevents Google Drive from returning virus scan warnings or quota errors on unbounded (bytes=0-) requests
    const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB chunk
    const rawRange = request.headers.get('range');
    let effectiveRange = rawRange;

    if (!rawRange) {
      effectiveRange = `bytes=0-${CHUNK_SIZE - 1}`;
    } else {
      const rangeMatch = rawRange.match(/bytes=(\d+)-(\d*)/);
      if (rangeMatch) {
        const start = parseInt(rangeMatch[1], 10);
        let end = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : (start + CHUNK_SIZE - 1);
        if (!rangeMatch[2] || (end - start + 1) > (20 * 1024 * 1024)) {
          end = start + CHUNK_SIZE - 1;
        }
        effectiveRange = `bytes=${start}-${end}`;
      }
    }

    const requestHeaders = new Headers();
    requestHeaders.set('Range', effectiveRange);
    requestHeaders.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

    // Primary: direct usercontent with confirm=t (bypasses >100MB virus scan screen)
    let driveUrl = `https://drive.usercontent.google.com/download?id=${videoId}&export=download&confirm=t`;

    let driveRes = await fetch(driveUrl, {
      headers: requestHeaders,
      redirect: 'follow',
    });

    let contentType = driveRes.headers.get('content-type') || '';

    // If Google returned an HTML page (virus scan form or quota exceeded)
    if (contentType.includes('text/html')) {
      const htmlText = await driveRes.text();
      const uuidMatch = htmlText.match(/name="uuid"\s+value="([^"]+)"/i);
      const confirmMatch = htmlText.match(/name="confirm"\s+value="([^"]+)"/i) || htmlText.match(/confirm=([0-9A-Za-z_-]+)/i);

      if (uuidMatch && uuidMatch[1]) {
        const confirmToken = (confirmMatch && (confirmMatch[1] || confirmMatch[2])) || 't';
        const actionMatch = htmlText.match(/<form[^>]*action="([^"]+)"/i);
        const baseUrl = actionMatch ? actionMatch[1] : 'https://drive.usercontent.google.com/download';
        const confirmedUrl = `${baseUrl}?id=${videoId}&export=download&confirm=${confirmToken}&uuid=${uuidMatch[1]}`;

        driveRes = await fetch(confirmedUrl, {
          headers: requestHeaders,
          redirect: 'follow',
        });
        contentType = driveRes.headers.get('content-type') || '';
      }

      // If still HTML (quota exceeded / permission restricted), NEVER CACHE
      if (contentType.includes('text/html')) {
        const isQuota = htmlText.includes('Quota exceeded') || htmlText.includes('Too many users');
        return new Response(JSON.stringify({
          error: isQuota ? 'quota_exceeded' : 'drive_blocked',
          message: isQuota
            ? 'Google Drive download quota exceeded for this file.'
            : 'Google Drive blocked streaming.',
          fileId: videoId
        }), {
          status: 503,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }

    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', driveRes.headers.get('content-type') || 'video/mp4');
    responseHeaders.set('Accept-Ranges', 'bytes');
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    responseHeaders.set('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');
    responseHeaders.set('Cross-Origin-Resource-Policy', 'cross-origin');

    if (driveRes.headers.get('content-range')) responseHeaders.set('Content-Range', driveRes.headers.get('content-range'));
    if (driveRes.headers.get('content-length')) responseHeaders.set('Content-Length', driveRes.headers.get('content-length'));

    if (driveRes.status === 200 || driveRes.status === 206) {
      responseHeaders.set('Cache-Control', 'public, max-age=86400, immutable');
    } else {
      responseHeaders.set('Cache-Control', 'no-store');
    }

    return new Response(driveRes.body, {
      status: driveRes.status,
      headers: responseHeaders
    });
  }
};
```

---

## 4. Setting Up Azure Backend (When Approved)

1. **Create Azure Web App:**
   - Linux, Node 20 LTS, F1 Free or B1 Basic tier.
2. **Environment Variables:**
   - `GOOGLE_CREDENTIALS`: *(Your Google Service Account JSON)*
   - `DRIVE_IMAGE_FOLDER_ID`: *(Your Drive folder ID)*
   - `NODE_ENV`: `production`
   - `SCM_DO_BUILD_DURING_DEPLOYMENT`: `true`
3. **Startup Command:** `node server.js`
4. **Update Frontend Base URL:**
   Update `baseUrl` in `my-app/src/components/ReviewPlayer.jsx` and `my-app/src/pages/Dashboard.jsx` to:
   `https://<your-app-name>.azurewebsites.net`
