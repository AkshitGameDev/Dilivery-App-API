const crypto = require('crypto');
const { prisma } = require('../../lib/prisma');
const { redis, KEYS } = require('../../lib/redis');

const hashOrder = (o)=> crypto.createHash('sha256').update(JSON.stringify(o)).digest('hex');

async function importOrder(payload, idemKey) {
  if (!idemKey) throw Object.assign(new Error('Missing Idempotency-Key'),{status:400,code:'missing_idem'});
  // idempotency check (10m)
  const idemK = KEYS.IDEMPOTENCY(idemKey);
  const exists = await redis.set(idemK, '1', 'NX', 'EX', 600);
  if (exists !== 'OK') return { status:'no_change' };

  const o = payload.order;
  const contentHash = hashOrder(o);
  const prev = await prisma.order.findUnique({ where:{ externalId:o.externalId } });

  if (prev && prev.contentHash === contentHash) return { status:'no_change' };

  const up = await prisma.order.upsert({
    where:{ externalId:o.externalId },
    update:{ contentHash },
    create:{
      externalId:o.externalId, placedAt:new Date(o.placedAt), currency:o.currency,
      contentHash
    }
  });

  // auto-create OPEN job on first create
  let jobId = null;
  if (!prev) {
    const j = await prisma.job.create({
      data:{
        status:'OPEN',
        pickupLat:o.job.pickupLat, pickupLng:o.job.pickupLng,
        dropoffLat:o.job.dropoffLat, dropoffLng:o.job.dropoffLng,
        pickupAddress:o.job.pickupAddress, dropoffAddress:o.job.dropoffAddress,
        orderId: up.id
      }
    });
    jobId = j.id;
  }

  return { status: prev ? 'updated':'created', jobId };
}

module.exports = { importOrder };
