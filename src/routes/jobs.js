import { Router } from 'express';
import { prisma } from '../db.js';

const r = Router();

const toRad = (x) => (x * Math.PI) / 180;
function haversineKm(a, b) {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s1 = Math.sin(dLat/2)**2 + Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*(Math.sin(dLng/2)**2);
  return 2 * R * Math.asin(Math.sqrt(s1));
}

r.get('/jobs/available', async (req, res) => {
  const { driverId, radiusKm = 8 } = req.query;
  if (!driverId) return res.status(400).json({ error: 'driverId required' });

  const d = await prisma.driver.findUnique({ where: { id: String(driverId) } });
  if (!d?.lat || !d?.lng) return res.status(404).json({ error: 'driver location unknown' });

  const jobs = await prisma.job.findMany({ where: { status: 'OPEN' }, take: 100 });
  const items = jobs.map(j => {
    const dist = (j.pickupLat != null && j.pickupLng != null)
      ? haversineKm({ lat: d.lat, lng: d.lng }, { lat: j.pickupLat, lng: j.pickupLng })
      : 9999;
    return { ...j, distanceKm: Math.round(dist * 100) / 100 };
  }).filter(j => j.distanceKm <= Number(radiusKm))
    .sort((a,b) => a.distanceKm - b.distanceKm)
    .slice(0, 20);

  res.json({ items });
});

r.post('/jobs/:id/accept', async (req, res) => {
  const { id } = req.params;
  const { driverId } = req.body || {};
  if (!driverId) return res.status(400).json({ error: 'driverId required' });
  try {
    const result = await prisma.$transaction(async (tx) => {
      const job = await tx.job.findUnique({ where: { id } });
      if (!job || job.status !== 'OPEN') throw new Error('Job not open');
      const updated = await tx.job.update({
        where: { id },
        data: { status: 'ASSIGNED', assignedDriverId: driverId },
      });
      await tx.driver.update({ where: { id: driverId }, data: { status: 'busy', lastAssignmentAt: new Date() } });
      return updated;
    });
    res.json({ ok: true, job: result });
  } catch (e) {
    res.status(409).json({ ok: false, error: String(e) });
  }
});

r.post('/jobs/:id/decline', async (_req, res) => res.json({ ok: true }));

r.post('/jobs/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body || {};
  if (!['PICKED_UP','DELIVERED','CANCELLED'].includes(status)) return res.status(400).json({ error: 'bad status' });
  try {
    const job = await prisma.job.update({ where: { id }, data: { status } });
    if (status === 'DELIVERED' && job.assignedDriverId) {
      await prisma.driver.update({ where: { id: job.assignedDriverId }, data: { status: 'available' } });
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

export default r;
