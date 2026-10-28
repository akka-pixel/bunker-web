import app from '../server.js';

export default function handler(req, res) {
  // CORS Headers for PWA, mobile clients, and cross-origin fetch
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.setHeader('Access-Control-Expose-Headers', 'X-Bunker-UI-Version');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  // Restore original request path when Vercel rewrites /api/* to /api
  const originalPath = req.headers['x-matched-path'] || req.headers['x-invoke-path'] || req.headers['x-vercel-original-url'];
  if (originalPath && originalPath !== '/api' && originalPath !== '/api/' && !req.url.startsWith('/api/')) {
    req.url = originalPath;
  }

  return app(req, res);
}
