import { Redis } from '@upstash/redis';

const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const KEY = 'o3_roster_state';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    try {
      const data = await redis.get(KEY);
      if (!data) return res.status(200).json({ exists: false });
      return res.status(200).json({ exists: true, data });
    } catch (err) {
      console.error('Redis GET error:', err);
      return res.status(500).json({ error: 'Failed to load state.' });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = req.body;
      if (!body || !Array.isArray(body.eligible) || !Array.isArray(body.na) || !Array.isArray(body.schedule)) {
        return res.status(400).json({ error: 'Invalid state shape.' });
      }
      await redis.set(KEY, JSON.stringify(body));
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('Redis SET error:', err);
      return res.status(500).json({ error: 'Failed to save state.' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed.' });
}
