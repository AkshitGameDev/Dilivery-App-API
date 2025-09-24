import { Router } from 'express';
import crypto from 'crypto';
import { prisma } from '../db.js';
import { redis } from '../redis.js';
import { z } from 'zod';

const r = Router();

const OrderSchema = z.object({
  platform: z.string().min(1),
  order: z.object({
    externalId: z.string().min(1),
    placedAt: z.string().datetime().optional(),
    currency: z.string().optional(),
    totals: z.object({
      subtotal: z.number().optional(),
      shipping: z.number().optional(),
      tax: z.number().optional(),
      grand: z.number().optional(),
    }).optional(),
    customer: z.object({
      name: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
    }).optional(),
    items: z.array(z.any()).optional(),
    shippingAddress: z.any().optional(),
    status: z.string().optional(),
  }),
});

r.post('/import-orders', async (req, res) => {
  try {
    const parsed = OrderSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const { platform, order } = parsed.data;

    const idem = req.get('Idempotency-Key');
    if (idem) {
      const key = `idem:orders:${idem}`;
      const set = await redis.set(key, '1', 'NX', 'EX', 120);
      if (set !== 'OK') {
        return res.status(409).json({ error: 'duplicate_request' });
      }
    }

    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(parsed.data))
      .digest('hex');

    const existing = await prisma.order.findUnique({
      where: { platform_externalId: { platform, externalId: order.externalId } },
      select: { id: true, rawPayloadHash: true },
    });
    if (existing && existing.rawPayloadHash === hash) {
      return res.json({ orderId: existing.id, status: 'no_change' });
    }

    const wasExisting = !!existing;

    const up = await prisma.order.upsert({
      where: { platform_externalId: { platform, externalId: order.externalId } },
      update: {
        status: order.status ?? 'CREATED',
        currency: order.currency,
        subtotal: order?.totals?.subtotal,
        shipping: order?.totals?.shipping,
        tax:      order?.totals?.tax,
        grand:    order?.totals?.grand,
        customerName:  order?.customer?.name,
        customerEmail: order?.customer?.email,
        customerPhone: order?.customer?.phone,
        placedAt: order?.placedAt ? new Date(order.placedAt) : null,
        items: order?.items ?? [],
        shippingAddr: order?.shippingAddress ?? {},
        rawPayloadHash: hash,
      },
      create: {
        platform,
        externalId: order.externalId,
        status: order.status ?? 'CREATED',
        currency: order.currency,
        subtotal: order?.totals?.subtotal,
        shipping: order?.totals?.shipping,
        tax:      order?.totals?.tax,
        grand:    order?.totals?.grand,
        customerName:  order?.customer?.name,
        customerEmail: order?.customer?.email,
        customerPhone: order?.customer?.phone,
        placedAt: order?.placedAt ? new Date(order.placedAt) : null,
        items: order?.items ?? [],
        shippingAddr: order?.shippingAddress ?? {},
        rawPayloadHash: hash,
      },
      select: { id: true },
    });

    return res.json({ orderId: up.id, status: wasExisting ? 'updated' : 'created' });
  } catch (e) {
    console.error('import-orders error:', e);
    return res.status(500).json({ error: 'internal_error' });
  }
});

export default r;
