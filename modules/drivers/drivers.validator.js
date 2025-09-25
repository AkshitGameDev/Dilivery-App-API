const { z } = require('zod');
const hbSchema = z.object({
  driverId:z.string(), name:z.string().optional(),
  lat:z.number(), lng:z.number(),
  status:z.enum(['available','busy','offline']).default('available')
});
module.exports = { hbSchema };
