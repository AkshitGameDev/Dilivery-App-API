import { Router } from 'express';
import crypto from 'crypto';
import { prisma } from '../db.js';
import { redis } from '../redis.js';

const r = Router();

r.post('/drivers/heartbeat', async (req, res) => {
  const { driverId, name = 'Driver', lat, lng, status = 'available' } = req.body || {};
  if (lat == null || lng == null) return res.status(400).json({ error: 'lat,lng required' });

  const id = driverId || crypto.randomUUID();
  try {
    const d = await prisma.driver.upsert({
      where: { id },
      update: { lat, lng, status, lastHeartbeat: new Date() },
      create: { id, name, lat, lng, status, lastHeartbeat: new Date() },
    });

    await redis.geoadd('drivers:geo', lng, lat, d.id);
    await redis.hset(`driver:${d.id}`, { status, lat, lng, ts: Date.now() });

    res.json({ ok: true, driverId: d.id });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

export default r;
