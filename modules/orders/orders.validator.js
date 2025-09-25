const { z } = require('zod');
const item = z.object({ sku:z.string(), name:z.string(), qty:z.number().int().positive(), price:z.number().nonnegative() });
const job = z.object({
  pickupLat:z.number(), pickupLng:z.number(),
  dropoffLat:z.number(), dropoffLng:z.number(),
  pickupAddress:z.string().optional(), dropoffAddress:z.string().optional()
});
const orderSchema = z.object({
  platform:z.string(),
  order:z.object({
    externalId:z.string(),
    placedAt:z.string(),
    currency:z.string(),
    totals:z.object({subtotal:z.number(), shipping:z.number(), tax:z.number(), grand:z.number()}),
    customer:z.object({name:z.string(), email:z.string().optional(), phone:z.string().optional()}),
    items:z.array(item).min(1),
    job:job
  })
});
module.exports = { orderSchema };
