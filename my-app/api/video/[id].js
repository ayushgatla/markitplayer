import axios from 'axios';

export default async function handler(req, res) {
  // CORS headers (optional since frontend and backend are on same domain, but good practice)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const videoId = req.query.id;
  let driveUrl = `https://drive.google.com/uc?export=download&id=${videoId}`;
  let cookies = [];

  try {
    let response = await axios({
      method: 'get',
      url: driveUrl,
      responseType: 'stream',
      headers: {
        Range: req.headers.range,
      },
      maxRedirects: 5,
      validateStatus: () => true 
    });

    if (response.headers['set-cookie']) {
      cookies = response.headers['set-cookie'];
    }

    if (response.headers['content-type'] && response.headers['content-type'].includes('text/html')) {
      let html = '';
      for await (const chunk of response.data) {
        html += chunk;
      }

      let confirmToken = 't';
      const confirmMatch = html.match(/confirm=([0-9A-Za-z_-]+)/i) || html.match(/name="confirm"\s+value="([^"]+)"/i);
      if (confirmMatch) {
        confirmToken = confirmMatch[1];
      }

      const uuidMatch = html.match(/name="uuid"\s+value="([^"]+)"/i);
      
      const directUrlMatch = html.match(/(https:\/\/[^"']*export=download[^"']*)/i);
      if (directUrlMatch) {
        driveUrl = directUrlMatch[1].replace(/&amp;/g, '&');
      } else {
        driveUrl = `https://drive.google.com/uc?export=download&id=${videoId}&confirm=${confirmToken}`;
        if (uuidMatch && uuidMatch[1]) {
           driveUrl += `&uuid=${uuidMatch[1]}`;
        }
      }
      
      response = await axios({
        method: 'get',
        url: driveUrl,
        responseType: 'stream',
        headers: {
          Range: req.headers.range,
          Cookie: cookies.map(c => c.split(';')[0]).join('; ')
        },
        maxRedirects: 5,
        validateStatus: () => true 
      });
    }

    res.status(response.status);
    
    ['content-type', 'content-length', 'accept-ranges', 'content-range'].forEach(header => {
      if (response.headers[header]) {
        res.setHeader(header, response.headers[header]);
      }
    });

    response.data.pipe(res);

    response.data.on('error', (err) => {
      console.error('Stream error:', err);
      res.end();
    });

  } catch (error) {
    console.error('Proxy Error:', error.message);
    if (!res.headersSent) {
      res.status(500).send('Error proxying the video');
    }
  }
}
