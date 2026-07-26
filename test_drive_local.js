require('dotenv').config();
const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');

const app = express();
app.use(cors());

let drive;
if (process.env.GOOGLE_CREDENTIALS) {
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
  drive = google.drive({ version: 'v3', auth });
}

app.get('/api/video/:id', async (req, res) => {
  const videoId = req.params.id;
  console.log("Request for video", videoId, "Range:", req.headers.range);

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
        if (response.headers && response.headers[header]) {
          res.setHeader(header, response.headers[header]);
        }
      });
      console.log("Sending headers:", res.getHeaders());

      response.data.pipe(res);
      response.data.on('error', (err) => {
        console.error('Drive API Stream error:', err);
        res.end();
      });
      return;
    } catch (error) {
      console.error('Drive API Video Stream Error:', error.message);
      res.status(500).send("Error");
    }
  } else {
      res.status(500).send("No drive client");
  }
});

app.listen(3002, () => console.log('Test server running on 3002'));
