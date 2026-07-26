require('dotenv').config();
const { google } = require('googleapis');
let drive;
if (process.env.GOOGLE_CREDENTIALS) {
  drive = google.drive({ version: 'v3', auth: new google.auth.GoogleAuth({ credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS), scopes: ['https://www.googleapis.com/auth/drive.readonly'] }) });
}

async function test() {
  const driveReqOpts = { responseType: 'stream', headers: { Range: 'bytes=0-100' } };
  const response = await drive.files.get({ fileId: '1WDO1k84xCSseAuEdESYnyzikEGnKsJeA', alt: 'media' }, driveReqOpts);
  console.log("HEADERS:", response.headers);
}
test();
