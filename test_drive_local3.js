require('dotenv').config();
const express = require('express');
const { google } = require('googleapis');
const app = express();
let drive = google.drive({ version: 'v3', auth: new google.auth.GoogleAuth({ credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS), scopes: ['https://www.googleapis.com/auth/drive.readonly'] }) });

app.get('/api/video/:id', async (req, res) => {
  const videoId = req.params.id;
  const driveReqOpts = { responseType: 'stream', headers: { Range: req.headers.range } };
  const response = await drive.files.get({ fileId: videoId, alt: 'media' }, driveReqOpts);
  console.log("EXPRESS response.headers:", response.headers);
  res.end();
});
app.listen(3003, () => console.log('Ready'));
