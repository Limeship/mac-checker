import { join } from 'path';

const DIST = join(import.meta.dir, 'dist');
const PORT = Number(process.env.PORT ?? 8080);
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3000';
const API_KEY = process.env.API_KEY ?? '';

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    // Proxy /api/* to the backend, injecting the API key server-side
    if (url.pathname.startsWith('/api/')) {
      const target = BACKEND_URL + url.pathname.replaceAll("/api/", "") + url.search;
      const headers = new Headers(req.headers);
      if (API_KEY) headers.set('Authorization', `Bearer ${API_KEY}`);
      return fetch(target, {
        method: req.method,
        headers,
        body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
      });
    }

    // Serve static file if it exists
    const file = Bun.file(join(DIST, url.pathname));
    if (await file.exists()) return new Response(file);

    // SPA fallback
    return new Response(Bun.file(join(DIST, 'index.html')));
  },
});

console.log(`Lime Tracker serving on :${PORT} (proxying /api/* → ${BACKEND_URL})`);
