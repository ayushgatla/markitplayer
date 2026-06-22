const url = 'https://drive.google.com/file/d/1_9iN4i1U7Gg-p4y3VvN2H-18a_F4Vq-Q/view?usp=sharing';
const gdMatch = url.match(/(?:drive\.google\.com\/(?:file\/d\/|open\?id=))([a-zA-Z0-9_-]+)/);
console.log(gdMatch ? gdMatch[1] : 'No match');
