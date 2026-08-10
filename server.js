require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { instagramGetUrl } = require('instagram-url-direct');
const { google } = require('googleapis');
const multer = require('multer');
const { Readable } = require('stream');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());

let drive;
try {
  if (process.env.GOOGLE_CREDENTIALS) {
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.readonly', 'https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive'],
    });
    drive = google.drive({ version: 'v3', auth });
    console.log("Google Drive API initialized successfully.");
  } else {
    console.warn("GOOGLE_CREDENTIALS environment variable is not set. Drive links will fallback to proxy scraping, which may fail.");
  }
} catch (e) {
  console.error("Failed to parse GOOGLE_CREDENTIALS", e);
}

const upload = multer({ storage: multer.memoryStorage() });

app.post('/api/upload-image', upload.single('image'), async (req, res) => {
  if (!drive) return res.status(500).send('Google Drive API not configured');
  if (!req.file) return res.status(400).send('No file uploaded');

  const folderId = process.env.DRIVE_IMAGE_FOLDER_ID;
  if (!folderId) return res.status(500).send('DRIVE_IMAGE_FOLDER_ID is not configured');

  try {
    const fileMetadata = {
      name: `chat-img-${Date.now()}-${req.file.originalname}`,
      parents: [folderId]
    };
    const media = {
      mimeType: req.file.mimetype,
      body: Readable.from(req.file.buffer)
    };

    const file = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, webViewLink, webContentLink'
    });

    // Make the file publicly accessible
    await drive.permissions.create({
      fileId: file.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      }
    });

    res.json({
      id: file.data.id,
      url: file.data.webViewLink,
      downloadUrl: file.data.webContentLink
    });
  } catch (error) {
    console.error('Drive API Upload Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/video/:id', async (req, res) => {
  const videoId = req.params.id;

  if (drive) {
    try {
      const driveReqOpts = { responseType: 'stream' };
      if (req.headers.range) {
         driveReqOpts.headers = { Range: req.headers.range };
      }
      
      const response = await drive.files.get(
        { fileId: videoId, alt: 'media' },
        driveReqOpts
      );

      res.status(response.status);
      
      res.setHeader('Accept-Ranges', 'bytes');
      ['content-type', 'content-length', 'content-range'].forEach(header => {
        const value = typeof response.headers.get === 'function' ? response.headers.get(header) : response.headers[header];
        if (value) {
          res.setHeader(header, value);
        }
      });

      response.data.pipe(res);
      response.data.on('error', (err) => {
        console.error('Drive API Stream error:', err);
        res.end();
      });
      return;
    } catch (error) {
      console.error('Drive API Video Stream Error:', error.message);
      // Fallback to scraping
    }
  }

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

  if (drive) {
    try {
      const fileInfo = await drive.files.get({
        fileId: videoId,
        fields: 'thumbnailLink'
      });
      if (fileInfo.data.thumbnailLink) {
        const thumbUrl = fileInfo.data.thumbnailLink.replace(/=s\d+$/, '=s800');
        return res.redirect(thumbUrl);
      }
    } catch (e) {
      console.error('Drive API Thumbnail Error:', e.message);
    }
  }

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

// Keep the error handlers for added safety
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
