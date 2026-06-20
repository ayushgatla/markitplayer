const axios = require('axios');
async function test() {
  const url = 'https://drive.google.com/uc?export=download&id=1WDO1k84xCSseAuEdESYnyzikEGnKsJeA';
  const response = await axios({
    method: 'get',
    url: url,
    responseType: 'stream',
    maxRedirects: 5,
    validateStatus: () => true 
  });
  console.log('Status:', response.status);
  console.log('Content-Type:', response.headers['content-type']);
  console.log('Content-Length:', response.headers['content-length']);
}
test();
