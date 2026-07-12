import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

// Load the Vite SSR-compiled backend handler
let handleAiRequest = null;
try {
  const handlerModule = await import('./dist-server/handler.js');
  handleAiRequest = handlerModule.handleAiRequest;
} catch (e) {
  console.warn('[Production Server] API handler bundle not found. Run "npm run build" first to compile frontend and backend assets.');
}

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  // Route API proxy requests
  if (pathname.startsWith('/api/ai/')) {
    if (handleAiRequest) {
      try {
        await handleAiRequest(req, res);
      } catch (error) {
        console.error('[Production Server] Error in API handler:', error);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'InternalServerError', message: error.message }));
      }
    } else {
      res.statusCode = 503;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'ServiceUnavailable', message: 'API handler not compiled or loading failed.' }));
    }
    return;
  }

  // Resolve static files
  let filePath = path.join(__dirname, 'dist', pathname);
  if (pathname === '/') {
    filePath = path.join(__dirname, 'dist', 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // SPA Fallback: serve index.html for unknown routes
        fs.readFile(path.join(__dirname, 'dist', 'index.html'), (err2, indexContent) => {
          if (err2) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Internal Server Error: Static client build not found.');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(indexContent, 'utf-8');
          }
        });
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Internal Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Production Server] Server running at http://localhost:${PORT}`);
});
