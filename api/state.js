const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const KEY     = 'o3_roster_state';
const VERSION = 'v4'; // bump this whenever defaults change

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    try {
      const raw = await redis.get(KEY);
      if (!raw) return res.status(200).json({ exists: false });
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
      // If version mismatch, tell client to use defaults
      if (data._version !== VERSION) {
        return res.status(200).json({ exists: false, reason: 'version_mismatch' });
      }
      return res.status(200).json({ exists: true, data });
    } catch (err) {
      console.error('GET error:', err);
      return res.status(500).json({ error: 'Failed to load.' });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = req.body;
      if (!body || !Array.isArray(body.eligible) || !Array.isArray(body.na) || !Array.isArray(body.schedule)) {
        return res.status(400).json({ error: 'Invalid state.' });
      }
      body._version = VERSION;
      await redis.set(KEY, body);
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('POST error:', err);
      return res.status(500).json({ error: 'Failed to save.' });
    }
  }

  // DELETE — wipe state (useful for forcing a reset)
  if (req.method === 'DELETE') {
    try {
      await redis.del(KEY);
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to delete.' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed.' });
};
