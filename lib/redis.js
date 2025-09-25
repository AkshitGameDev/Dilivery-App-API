const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL);
const KEYS = {
  DRIVER_GEO: 'drivers:geo',
  DRIVER_HASH: (id)=>`driver:${id}:hash`,
  IDEMPOTENCY: (k)=>`idem:${k}`,
};
module.exports = { redis, KEYS };
