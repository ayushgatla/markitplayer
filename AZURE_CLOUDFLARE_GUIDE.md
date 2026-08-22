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
  async fetch(request) {
    const url = new URL(request.url);
    const match = url.pathname.match(/\/api\/video\/([a-zA-Z0-9_-]+)/);
    if (!match) return new Response("Not found", { status: 404 });

    const videoId = match[1];
    const driveUrl = `https://drive.google.com/uc?export=download&id=${videoId}`;

    const response = await fetch(driveUrl, {
      headers: request.headers,
      cf: { cacheEverything: true, cacheTtl: 86400 }
    });

    return new Response(response.body, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'video/mp4',
        'Accept-Ranges': 'bytes',
        'Content-Range': response.headers.get('content-range') || '',
        'Content-Length': response.headers.get('content-length') || '',
        'Access-Control-Allow-Origin': '*',
      }
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
