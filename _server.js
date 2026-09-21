const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const root = __dirname;
const basePath = '/viabilidade-estrategica';

const server = http.createServer((req, res) => {
  let reqPath = decodeURIComponent(url.parse(req.url).pathname);
  if (reqPath === basePath || reqPath === `${basePath}/`) {
    reqPath = '/index.html';
  } else if (reqPath.startsWith(`${basePath}/`)) {
    reqPath = reqPath.slice(basePath.length);
  } else if (reqPath === '/') {
    reqPath = '/index.html';
  }
  if (reqPath.endsWith('/')) reqPath += 'index.html';
  const filePath = path.join(root, reqPath);
  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Not found: ' + reqPath);
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(8000, () => {
  console.log('Server running at http://localhost:8000/');
});
