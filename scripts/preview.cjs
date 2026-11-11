const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const php = process.env.KKG_PHP || path.join(root, '.tools/php/php.exe');
const port = Number(process.env.PORT || 4173);
const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/grosir/') {
    try {
      const html = execFileSync(php, [path.join(__dirname, 'render-preview.php')], { encoding: 'utf8' });
      res.writeHead(200, {'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}); res.end(html);
    } catch (_) { res.writeHead(500); res.end('PHP preview failed'); }
  } else if (['/assets/landing.css', '/assets/landing.js', '/assets/logo-kk.webp'].includes(req.url)) {
    const type = req.url.endsWith('.css') ? 'text/css' : req.url.endsWith('.webp') ? 'image/webp' : 'text/javascript';
    res.writeHead(200, {'Content-Type': type});
    res.end(fs.readFileSync(path.join(root,'wordpress/kk-grosir',req.url)));
  } else { res.writeHead(404); res.end('Not found'); }
});
server.listen(port, '127.0.0.1', () => console.log('Preview: http://127.0.0.1:' + port));
process.on('SIGINT', () => server.close());
