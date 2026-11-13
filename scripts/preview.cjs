const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const php = process.env.KKG_PHP || path.join(root, '.tools/php/php.exe');
const port = Number(process.env.PORT || 4173);
const server = http.createServer((req, res) => {
  const reqUrl = new URL(req.url, 'http://127.0.0.1');
  if (reqUrl.pathname === '/' || reqUrl.pathname === '/grosir/') {
    try {
      const modeArg = reqUrl.searchParams.get('mode') === 'active' ? 'active' : 'staging';
      const consentArg = ['standalone', 'external'].includes(reqUrl.searchParams.get('consent')) ? reqUrl.searchParams.get('consent') : 'disabled';
      const html = execFileSync(php, [path.join(__dirname, 'render-preview.php'), modeArg, consentArg], { encoding: 'utf8' });
      res.writeHead(200, {'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}); res.end(html);
    } catch (_) { res.writeHead(500); res.end('PHP preview failed'); }
  } else if (['/assets/landing.css', '/assets/landing.js', '/assets/cookiebot-bridge.js', '/assets/logo-kk.webp', '/assets/hero-kk.webp', '/assets/about-gudang-kk.webp', '/assets/category-0-bra-wanita.webp', '/assets/category-1-cd-pria.webp', '/assets/category-2-cd-wanita.webp', '/assets/category-3-kaos-kaki.webp', '/assets/category-4-handuk.webp', '/assets/inter-latin-wght-normal.woff2'].includes(reqUrl.pathname)) {
    const type = reqUrl.pathname.endsWith('.css') ? 'text/css' : reqUrl.pathname.endsWith('.webp') ? 'image/webp' : reqUrl.pathname.endsWith('.woff2') ? 'font/woff2' : 'text/javascript';
    res.writeHead(200, {'Content-Type': type});
    res.end(fs.readFileSync(path.join(root,'wordpress/kk-grosir',reqUrl.pathname)));
  } else { res.writeHead(404); res.end('Not found'); }
});
server.listen(port, '127.0.0.1', () => console.log('Preview: http://127.0.0.1:' + port));
process.on('SIGINT', () => server.close());
