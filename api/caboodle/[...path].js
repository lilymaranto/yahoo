/**
 * Vercel serverless proxy — Caboodle blocks browser CORS for X-API-Key requests.
 * Browser calls /api/caboodle/0bQsV2En (same origin); this forwards with the API key.
 */

const CABOODLE_BASE = 'https://soleng-caboodle-sheets-e2eca0cb7cdb.herokuapp.com/api/v1';
const CABOODLE_API_KEY = 'ck_647e85d86fef2d92b311956d611d1f4905451b367df417fc';

export default async function handler(req, res) {
  const segments = req.query.path;
  const slug = Array.isArray(segments) ? segments.join('/') : segments || '0bQsV2En';

  const queryStart = req.url?.indexOf('?') ?? -1;
  const query = queryStart >= 0 ? req.url.slice(queryStart) : '';

  const target = `${CABOODLE_BASE}/${slug}${query}`;

  const headers = {
    Accept: 'application/json',
    'X-API-Key': CABOODLE_API_KEY,
  };

  const method = req.method || 'GET';
  const init = { method, headers };

  if (method !== 'GET' && method !== 'HEAD') {
    headers['Content-Type'] = 'application/json';
    if (req.body) {
      init.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }
  }

  try {
    const upstream = await fetch(target, init);
    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
    res.send(text);
  } catch (err) {
    console.error('[yahoo] Caboodle proxy error:', err);
    res.status(502).json({ error: 'Caboodle proxy failed', message: String(err) });
  }
}
