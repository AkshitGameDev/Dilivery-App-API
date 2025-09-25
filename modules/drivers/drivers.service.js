const { redis, KEYS } = require('../../lib/redis');

async function heartbeat({driverId, name, lat, lng, status}) {
  const now = Date.now();
  await redis.geoadd(KEYS.DRIVER_GEO, lng, lat, driverId);
  await redis.hset(KEYS.DRIVER_HASH(driverId), {
    name: name || '',
    status, lat, lng,
    ts: now
  });
  // TTL to auto-expire stale drivers (3m)
  await redis.expire(KEYS.DRIVER_HASH(driverId), 180);
  return { ok:true, ts:now };
}
module.exports = { heartbeat };
