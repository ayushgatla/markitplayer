/**
 * MarkitPlayer - Cloudflare Video Proxy Worker
 *
 * Solves:
 * 1. Bypasses Google Drive >100MB virus scan warning by calling usercontent directly with confirm=t.
 * 2. Enforces bounded chunks (10MB) for open-ended Range requests (e.g. bytes=0-),
 *    preventing Google Drive from triggering full-file download virus scan warnings or quota blocks.
 * 3. Parses and handles dynamic uuid and confirm tokens if present.
 * 4. Never caches HTML error pages (e.g. Quota exceeded, rate limits).
 * 5. Supports HTTP Range requests for instant video scrubbing and seeking in Video.js.
 * 6. Full CORS and Cross-Origin-Resource-Policy headers so browser video players never get blocked.
 */

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

    // 2. Extract Video ID from path: /api/video/:id
    const match = url.pathname.match(/\/api\/video\/([a-zA-Z0-9_-]+)/);
    if (!match) {
      return new Response(JSON.stringify({ error: "Invalid video endpoint or ID" }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    const videoId = match[1];

    // 3. Prepare Range header with bounded chunks
    // Google Drive blocks full-file / unbounded requests (like bytes=0- or no range) on files >100MB.
    // By enforcing bounded 10MB chunks, Google Drive serves the partial video stream (Status 206) without virus warning or quota triggers!
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

    // 4. Primary direct usercontent URL with confirm=t
    let driveUrl = `https://drive.usercontent.google.com/download?id=${videoId}&export=download&confirm=t`;

    let driveRes = await fetch(driveUrl, {
      headers: requestHeaders,
      redirect: 'follow',
    });

    let contentType = driveRes.headers.get('content-type') || '';

    // 5. If Google returns HTML (virus scan confirmation form or quota exceeded)
    if (contentType.includes('text/html')) {
      const htmlText = await driveRes.text();

      // Check if it's a virus scan form requiring a dynamic uuid/confirm token
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
            ? 'Google Drive download quota exceeded for this file. Too many users have accessed it recently.'
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

    // 6. Build response headers for successful video streaming
    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', driveRes.headers.get('content-type') || 'video/mp4');
    responseHeaders.set('Accept-Ranges', 'bytes');
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    responseHeaders.set('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');
    responseHeaders.set('Cross-Origin-Resource-Policy', 'cross-origin');

    if (driveRes.headers.get('content-range')) {
      responseHeaders.set('Content-Range', driveRes.headers.get('content-range'));
    }
    if (driveRes.headers.get('content-length')) {
      responseHeaders.set('Content-Length', driveRes.headers.get('content-length'));
    }

    // Only cache genuine media responses (status 200 or 206)
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
