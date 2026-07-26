require('dotenv').config();
const express = require('express');
const { google } = require('googleapis');
const app = express();
let drive = google.drive({ version: 'v3', auth: new google.auth.GoogleAuth({ credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS), scopes: ['https://www.googleapis.com/auth/drive.readonly'] }) });

app.get('/api/video/:id', async (req, res) => {
  const driveReqOpts = { responseType: 'stream', headers: { Range: req.headers.range } };
  const response = await drive.files.get({ fileId: req.params.id, alt: 'media' }, driveReqOpts);
  console.log("Drive headers:", response.headers);
  ['content-type', 'content-length', 'content-range'].forEach(h => {
    if (response.headers[h]) res.setHeader(h, response.headers[h]);
  });
  console.log("Express headers:", res.getHeaders());
  response.data.pipe(res);
});
app.listen(3004, () => console.log('Ready'));
