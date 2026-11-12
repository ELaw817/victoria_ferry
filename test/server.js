// ===== test/server.js =====
// 極簡靜態伺服器，用嚟本機試玩。冇 build step、冇 dependency。
// 用法：node test/server.js  然後開 http://127.0.0.1:5173

const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const port = 5173;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
};

http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';

  const file = path.join(root, p);
  if (!file.startsWith(root)) {
    res.writeHead(403);
    return res.end('403');
  }

  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('404 ' + p);
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(port, () => {
  console.log('維多利亞小輪 dev server: http://127.0.0.1:' + port);
});
