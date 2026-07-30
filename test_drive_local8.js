require('dotenv').config();
const { google } = require('googleapis');
let drive = google.drive({ version: 'v3', auth: new google.auth.GoogleAuth({ credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS), scopes: ['https://www.googleapis.com/auth/drive.readonly'] }) });

async function test() {
  const response = await drive.files.get({ fileId: '1WDO1k84xCSseAuEdESYnyzikEGnKsJeA', alt: 'media' }, { responseType: 'stream', headers: { Range: 'bytes=0-100' } });
  
  console.log("Status:", response.status);
}
test();
