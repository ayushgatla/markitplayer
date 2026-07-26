require('dotenv').config();
const { google } = require('googleapis');
const axios = require('axios');

async function test() {
  let drive;
  if (process.env.GOOGLE_CREDENTIALS) {
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
    drive = google.drive({ version: 'v3', auth });
    console.log("Google Drive API initialized successfully.");
  } else {
    console.warn("No credentials");
    return;
  }

  const videoId = '1WDO1k84xCSseAuEdESYnyzikEGnKsJeA';
  
  try {
    console.log("Fetching file thumbnail and metadata...");
    const fileInfo = await drive.files.get({
      fileId: videoId,
      fields: 'thumbnailLink, webContentLink, mimeType, size'
    });
    console.log("File Info:", fileInfo.data);
    
    console.log("\nTesting streaming...");
    const driveReqOpts = { responseType: 'stream', headers: { Range: 'bytes=0-100' } };
    const response = await drive.files.get(
      { fileId: videoId, alt: 'media' },
      driveReqOpts
    );
    console.log("Stream Response Headers:", response.headers);
    console.log("Stream Response Status:", response.status);
    
  } catch (err) {
    console.error("Error:", err.message);
  }
}
test();
