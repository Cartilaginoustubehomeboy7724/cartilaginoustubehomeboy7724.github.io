/* ===== 本地静态服务：node serve.js ===== */
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const os = require('os');

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 8765;
const HOST = process.env.HOST || '0.0.0.0';   // 监听所有网卡，手机可通过局域网访问

function lanIPs() {
  const out = [];
  const ifs = os.networkInterfaces();
  Object.keys(ifs).forEach(function (name) {
    (ifs[name] || []).forEach(function (it) {
      if (it.family === 'IPv4' && !it.internal) out.push({ name: name, addr: it.address });
    });
  });
  return out;
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  let pathname = decodeURIComponent(url.parse(req.url).pathname);
  if (pathname === '/' || pathname === '') pathname = '/index.html';

  const filePath = path.join(ROOT, pathname);
  // 防目录穿越
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  fs.readFile(filePath, (err, buf) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    res.end(buf);
  });
});

server.listen(PORT, HOST, () => {
  const url = 'http://127.0.0.1:' + PORT;
  console.log('行者 · 徒步计划与装备管理');
  console.log('本机地址： ' + url);
  const lans = lanIPs();
  if (lans.length) {
    console.log('\n手机访问（需与电脑同一 WiFi）：');
    lans.forEach(l => console.log('  [' + l.name + ']  http://' + l.addr + ':' + PORT));
  }
  console.log('\n提示：手机浏览器打开上方地址后，可在菜单里「添加到主屏幕」当 App 用。');
  console.log('停止服务： Ctrl + C');

  // 非测试场景自动打开默认浏览器
  if (process.env.AUTO_OPEN !== '0') {
    try {
      require('child_process').exec('start "" "' + url + '"');
    } catch (e) { /* 打不开也无妨，手动访问即可 */ }
  }
});
