const { z } = require('zod');
const availByDriver = {
  query: z.object({ driverId:z.string(), radiusKm:z.coerce.number().default(5) })
};
const availByCoords = {
  query: z.object({ lat:z.coerce.number(), lng:z.coerce.number(), radiusKm:z.coerce.number().default(5) })
};
const acceptSchema = z.object({ driverId:z.string() });
module.exports = { availByDriver, availByCoords, acceptSchema };
