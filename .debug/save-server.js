// Server kecil untuk menerima screenshot dari halaman game (untuk verifikasi visual)
const http = require('http');
const fs = require('fs');
const path = require('path');

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') { res.end(); return; }
  if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }

  let body = '';
  req.on('data', (c) => body += c);
  req.on('end', () => {
    const name = (req.url.replace(/[^a-z0-9_-]/gi, '') || 'shot') + '.jpg';
    const b64 = body.replace(/^data:image\/\w+;base64,/, '');
    fs.writeFileSync(path.join(__dirname, name), Buffer.from(b64, 'base64'));
    res.end('saved ' + name);
  });
}).listen(4999, () => console.log('save-server on :4999'));
