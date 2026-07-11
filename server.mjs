import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';

const host = process.env.HOST || '0.0.0.0';
const port = Number(process.env.PORT || 3000);
const distDir = resolve('dist');
const indexFile = join(distDir, 'index.html');

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

function sendFile(response, filePath) {
  const stream = createReadStream(filePath);
  response.writeHead(200, {
    'Content-Type': contentTypes[extname(filePath)] || 'application/octet-stream',
    'Cache-Control': filePath === indexFile ? 'no-cache' : 'public, max-age=31536000, immutable',
  });
  stream.pipe(response);
  stream.on('error', () => {
    response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Internal server error');
  });
}

createServer((request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || `${host}:${port}`}`);
  const decodedPath = decodeURIComponent(url.pathname);
  const safePath = normalize(decodedPath).replace(/^(\.\.[/\\])+/, '');
  const requestedFile = resolve(distDir, `.${safePath}`);
  const isInsideDist = requestedFile === distDir || requestedFile.startsWith(`${distDir}${sep}`);

  if (isInsideDist && existsSync(requestedFile) && statSync(requestedFile).isFile()) {
    sendFile(response, requestedFile);
    return;
  }

  if (existsSync(indexFile)) {
    sendFile(response, indexFile);
    return;
  }

  response.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
  response.end('Production build not found. Run npm run build before starting the server.');
}).listen(port, host, () => {
  console.log(`Serving ${distDir} on http://${host}:${port}`);
});
