const axios = require("axios");
async function test() {
  const videoId = "1Q8mIdb2IL8z3Tw7dSmYj5jumCpyk-qYz";
  let driveUrl = `https://drive.google.com/uc?export=download&id=${videoId}`;
  let cookies = [];

  try {
    let response = await axios({
      method: 'get',
      url: driveUrl,
      headers: {},
      maxRedirects: 5,
      validateStatus: () => true 
    });

    if (response.headers['set-cookie']) {
      cookies = response.headers['set-cookie'];
    }

    if (response.headers['content-type'] && response.headers['content-type'].includes('text/html')) {
      let html = response.data;
      let confirmToken = 't';
      const confirmMatch = html.match(/confirm=([0-9A-Za-z_-]+)/i) || html.match(/name="confirm"\s+value="([^"]+)"/i);
      if (confirmMatch) {
        confirmToken = confirmMatch[1] || confirmMatch[2]; // WAIT I ONLY DID confirmMatch[1]
      }

      const uuidMatch = html.match(/name="uuid"\s+value="([^"]+)"/i);
      const actionMatch = html.match(/<form[^>]*action="([^"]+)"/i);
      const baseUrl = actionMatch ? actionMatch[1] : 'https://drive.usercontent.google.com/download';
      
      driveUrl = `${baseUrl}?id=${videoId}&export=download&confirm=${confirmToken}`;
      if (uuidMatch && uuidMatch[1]) {
         driveUrl += `&uuid=${uuidMatch[1]}`;
      }
      
      console.log("Using token:", confirmToken);

      response = await axios({
        method: 'get',
        url: driveUrl,
        headers: {
          Cookie: cookies.map(c => c.split(';')[0]).join('; ')
        },
        maxRedirects: 5,
        validateStatus: () => true 
      });
      
      require("fs").writeFileSync("test_drive_html_2.html", response.data);
      console.log("Wrote test_drive_html_2.html");
    }
  } catch(e) {
    console.error(e);
  }
}
test();
