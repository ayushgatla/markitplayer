require('dotenv').config();
const { google } = require('googleapis');
const axios = require('axios');
let drive = google.drive({ version: 'v3', auth: new google.auth.GoogleAuth({ credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS), scopes: ['https://www.googleapis.com/auth/drive.readonly'] }) });

async function test() {
  const fileInfo = await drive.files.get({ fileId: '1WDO1k84xCSseAuEdESYnyzikEGnKsJeA', fields: 'thumbnailLink' });
  const thumbUrl = fileInfo.data.thumbnailLink;
  console.log("Got thumbnailLink:", thumbUrl);
  try {
      const res = await axios.get(thumbUrl);
      console.log("Status:", res.status, "Content-Type:", res.headers['content-type']);
  } catch(e) {
      console.log("Error downloading thumbnail:", e.response ? e.response.status : e.message);
  }
}
test();
