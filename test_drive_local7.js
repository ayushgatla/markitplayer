require('dotenv').config();
const express = require('express');
const { google } = require('googleapis');
const app = express();
let drive = google.drive({ version: 'v3', auth: new google.auth.GoogleAuth({ credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS), scopes: ['https://www.googleapis.com/auth/drive.readonly'] }) });

app.get('/api/video/:id', async (req, res) => {
  const driveReqOpts = { responseType: 'stream' };
  if (req.headers.range) driveReqOpts.headers = { Range: req.headers.range };
  
  const response = await drive.files.get({ fileId: req.params.id, alt: 'media' }, driveReqOpts);
  
  res.status(response.status);
  res.setHeader('Accept-Ranges', 'bytes');
  ['content-type', 'content-length', 'content-range'].forEach(h => {
    const value = typeof response.headers.get === 'function' ? response.headers.get(h) : response.headers[h];
    if (value) res.setHeader(h, value);
  });
  console.log("Express headers before pipe:", res.getHeaders());
  response.data.pipe(res);
});
app.listen(3007, () => console.log('Ready'));
