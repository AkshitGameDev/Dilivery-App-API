import { Router } from 'express';
import crypto from 'crypto';
import { prisma } from '../db.js';

const r = Router();

/**
 * POST /api/import-orders
 * Upserts by (platform, externalId). Stores a payload hash for change detection.
 * Returns: { orderId, status: "created_or_updated" | "no_change" }
 */
r.post('/import-orders', async (req, res) => {
  try {
    // basic shape checks (keep simple for now)
    const { platform, order } = req.body || {};
    if (!platform || !order?.externalId) {
      return res.status(400).json({ error: 'platform & order.externalId required' });
    }

    // Create a stable hash of the payload to detect identical replays
    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(req.body))
      .digest('hex');

    // If same order exists with same hash → no_change
    const existing = await prisma.order.findUnique({
      where: { platform_externalId: { platform, externalId: order.externalId } },
      select: { id: true, rawPayloadHash: true }
    });
    if (existing && existing.rawPayloadHash === hash) {
      return res.json({ orderId: existing.id, status: 'no_change' });
    }

    // Upsert normalized fields
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
      select: { id: true }
    });

    res.json({ orderId: up.id, status: 'created_or_updated' });
  } catch (e) {
    console.error('import-orders error:', e);
    res.status(500).json({ error: 'internal_error' });
  }
});

export default r;
