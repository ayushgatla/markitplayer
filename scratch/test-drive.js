const axios = require('axios');

async function test() {
  const videoId = '1mSoV-VFyWIDDqc7UP40JIMZ3jAimrlSr';
  let driveUrl = `https://drive.google.com/uc?export=download&id=${videoId}`;
  console.log('Fetching:', driveUrl);
  try {
    let response = await axios({
      method: 'get',
      url: driveUrl,
      responseType: 'stream',
      maxRedirects: 5,
      validateStatus: () => true 
    });
    console.log('Response status:', response.status);
    console.log('Content-Type:', response.headers['content-type']);
    let html = '';
    if (response.headers['content-type'] && response.headers['content-type'].includes('text/html')) {
      for await (const chunk of response.data) {
        html += chunk;
      }
      console.log('Got HTML, checking for warning...');
      const uuidMatch = html.match(/name="uuid"\s+value="([^"]+)"/i);
      const confirmMatch = html.match(/name="confirm"\s+value="([^"]+)"/i) || [null, 't'];
      
      driveUrl = `https://drive.usercontent.google.com/download?id=${videoId}&export=download&confirm=${confirmMatch[1]}`;
      if (uuidMatch && uuidMatch[1]) {
         driveUrl += `&uuid=${uuidMatch[1]}`;
      }
      console.log('Second URL:', driveUrl);
      
      response = await axios({
        method: 'get',
        url: driveUrl,
        responseType: 'stream',
        maxRedirects: 5,
        validateStatus: () => true 
      });
      console.log('Second Response status:', response.status);
      console.log('Second Content-Type:', response.headers['content-type']);
    } else {
      console.log('Not an HTML response. Direct stream.');
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}
test();
