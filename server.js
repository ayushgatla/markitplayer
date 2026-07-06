const express = require('express');
const cors = require('cors');
const axios = require('axios');
const torrentStream = require('torrent-stream');
const { instagramGetUrl } = require('instagram-url-direct');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());

app.get('/api/video/:id', async (req, res) => {
  const videoId = req.params.id;
  let driveUrl = `https://drive.google.com/uc?export=download&id=${videoId}`;
  let cookies = [];

  try {
    let response = await axios({
      method: 'get',
      url: driveUrl,
      responseType: 'stream',
      headers: {
        Range: req.headers.range,
      },
      maxRedirects: 5,
      validateStatus: () => true 
    });

    if (response.headers['set-cookie']) {
      cookies = response.headers['set-cookie'];
    }

    // Check if Google Drive returned the virus scan warning HTML page
    if (response.headers['content-type'] && response.headers['content-type'].includes('text/html')) {
      let html = '';
      for await (const chunk of response.data) {
        html += chunk;
      }

      let confirmToken = 't';
      const confirmMatch = html.match(/confirm=([0-9A-Za-z_-]+)/i) || html.match(/name="confirm"\s+value="([^"]+)"/i);
      if (confirmMatch) {
        confirmToken = confirmMatch[1] || confirmMatch[2];
      }

      const uuidMatch = html.match(/name="uuid"\s+value="([^"]+)"/i);
      
      const actionMatch = html.match(/<form[^>]*action="([^"]+)"/i);
      const baseUrl = actionMatch ? actionMatch[1] : 'https://drive.usercontent.google.com/download';
      
      driveUrl = `${baseUrl}?id=${videoId}&export=download&confirm=${confirmToken}`;
      if (uuidMatch && uuidMatch[1]) {
         driveUrl += `&uuid=${uuidMatch[1]}`;
      }
      
      // Make the second request bypassing the warning
      response = await axios({
        method: 'get',
        url: driveUrl,
        responseType: 'stream',
        headers: {
          Range: req.headers.range,
          Cookie: cookies.map(c => c.split(';')[0]).join('; ')
        },
        maxRedirects: 5,
        validateStatus: () => true 
      });
    }

    res.status(response.status);
    
    ['content-type', 'content-length', 'accept-ranges', 'content-range'].forEach(header => {
      if (response.headers[header]) {
        res.setHeader(header, response.headers[header]);
      }
    });

    response.data.pipe(res);

    response.data.on('error', (err) => {
      console.error('Stream error:', err);
      res.end();
    });

  } catch (error) {
    console.error('Proxy Error:', error.message);
    if (!res.headersSent) {
      res.status(500).send('Error proxying the video');
    }
  }
});

app.get('/api/thumbnail/:id', async (req, res) => {
  const videoId = req.params.id;
  try {
    const response = await axios({
      method: 'get',
      url: `https://drive.google.com/thumbnail?id=${videoId}&sz=w800-h600`,
      responseType: 'stream',
      maxRedirects: 5,
      validateStatus: () => true 
    });
    
    ['content-type', 'content-length', 'cache-control'].forEach(header => {
      if (response.headers[header]) {
        res.setHeader(header, response.headers[header]);
      }
    });

    response.data.pipe(res);
  } catch (error) {
    console.error('Thumbnail Proxy Error:', error.message);
    res.status(500).send('Error proxying the thumbnail');
  }
});

app.get('/api/torrent', (req, res) => {
  const magnet = req.query.magnet;
  if (!magnet) return res.status(400).send('Magnet link required');
  
  const engine = torrentStream(magnet);
  
  engine.on('ready', () => {
    const file = engine.files.reduce((a, b) => a.length > b.length ? a : b);
    const range = req.headers.range;
    
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : file.length - 1;
      const chunksize = (end - start) + 1;
      
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${file.length}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4'
      });
      file.createReadStream({start, end}).pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': file.length,
        'Content-Type': 'video/mp4'
      });
      file.createReadStream().pipe(res);
    }
  });

  engine.on('error', (err) => {
    console.error('Torrent engine error:', err);
    if (!res.headersSent) res.status(500).send('Error streaming torrent');
  });
});

app.get('/api/instagram', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send('Instagram URL required');
  
  try {
    const links = await instagramGetUrl(url);
    if (links && links.url_list && links.url_list.length > 0) {
      const directUrl = links.url_list[0];
      const response = await axios({
        method: 'get',
        url: directUrl,
        responseType: 'stream',
        headers: { Range: req.headers.range },
        validateStatus: () => true
      });
      
      res.status(response.status);
      ['content-type', 'content-length', 'accept-ranges', 'content-range'].forEach(header => {
        if (response.headers[header]) {
          res.setHeader(header, response.headers[header]);
        }
      });
      response.data.pipe(res);
    } else {
      res.status(404).send('Video not found in Instagram post');
    }
  } catch (err) {
    console.error('Instagram proxy error:', err.message);
    if (!res.headersSent) res.status(500).send('Error proxying Instagram video');
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server is running on http://localhost:${PORT}`);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
console.log('Server file loaded successfully.');
