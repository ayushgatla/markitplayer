const fs = require("fs");
const html = fs.readFileSync("test_drive_html.html", "utf8");
const confirmMatch = html.match(/confirm=([0-9A-Za-z_-]+)/i) || html.match(/name="confirm"\s+value="([^"]+)"/i);
console.log("Match:", confirmMatch);
