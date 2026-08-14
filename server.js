const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

let extractInFlight = false;

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/extract') {
    if (extractInFlight) {
      res.writeHead(409, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, log: 'Đang có một lượt trích xuất khác chạy rồi, đợi xong đã.' }));
      return;
    }
    extractInFlight = true;
    execFile('node', ['extract_plan.js'], { cwd: __dirname, timeout: 300000, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      extractInFlight = false;
      res.writeHead(err ? 500 : 200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: !err, log: (stdout || '') + (stderr || '') || String(err) }));
    });
    return;
  }

  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = path.join(__dirname, filePath.split('?')[0]);

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 File Not Found');
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`Loading Plan Hub running at http://localhost:${PORT}`);
});
