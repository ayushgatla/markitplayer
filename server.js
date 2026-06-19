const express = require('express');
const cors = require('cors');
const axios = require('axios');

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

      const uuidMatch = html.match(/name="uuid"\s+value="([^"]+)"/i);
      const confirmMatch = html.match(/name="confirm"\s+value="([^"]+)"/i) || [null, 't'];
      
      driveUrl = `https://drive.usercontent.google.com/download?id=${videoId}&export=download&confirm=${confirmMatch[1]}`;
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
