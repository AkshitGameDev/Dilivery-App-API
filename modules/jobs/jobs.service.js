const { prisma } = require('../../lib/prisma');
const { redis, KEYS } = require('../../lib/redis');

const STALE_MS = 120_000;

async function availableByDriver(driverId, radiusKm) {
  const h = await redis.hgetall(KEYS.DRIVER_HASH(driverId));
  if (!h.ts || (Date.now() - Number(h.ts)) > STALE_MS) return [];
  const [lng,lat] = [Number(h.lng), Number(h.lat)];
  return availableByCoords(lat,lng,radiusKm);
}

function haversineKm(a,b){
  const toRad = d=>d*Math.PI/180, R=6371;
  const dLat=toRad(a.lat-b.lat), dLng=toRad(a.lng-b.lng);
  const s=Math.sin(dLat/2)**2 + Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.sqrt(s));
}

async function availableByCoords(lat,lng,radiusKm) {
  const jobs = await prisma.job.findMany({ where:{ status:'OPEN' }, orderBy:{ createdAt:'asc' } });
  return jobs.filter(j => haversineKm({lat,lng},{lat:j.pickupLat,lng:j.pickupLng}) <= radiusKm);
}

async function acceptJob(jobId, driverId) {
  return await prisma.$transaction(async (tx)=>{
    const job = await tx.job.findUnique({ where:{ id:jobId }, select:{ id:true,status:true, driverId:true } });
    if (!job || job.status!=='OPEN') throw Object.assign(new Error('conflict'),{status:409,code:'already_taken'});
    const updated = await tx.job.update({ where:{ id:jobId }, data:{ status:'ASSIGNED', driverId } });
    return updated;
  }, { maxWait:5000, timeout:5000 });
}

module.exports = { availableByDriver, availableByCoords, acceptJob };
