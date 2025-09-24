// src/index.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pino from 'pino';

import { prisma } from './db.js';
import { redis } from './redis.js';
import ordersRouter from './routes/orders.js';
import driversRouter from './routes/drivers.js';
import jobsRouter from './routes/jobs.js'; // comment out if you don't have it yet

const app = express();
const log = pino({ name: 'pilotx-api' });
const PORT = Number(process.env.PORT) || 4000;

/* ---------- app setup ---------- */
app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(',').map(s => s.trim()) || '*',
    credentials: true,
  })
);
// protect against accidental huge bodies
app.use(express.json({ limit: '1mb' }));

/* ---------- health ---------- */
app.get('/', (_req, res) =>
  res.json({ ok: true, service: 'pilotx-api', ts: new Date().toISOString() })
);

app.get('/healthz', (_req, res) =>
  res.json({ ok: true, service: 'pilotx-api', ts: new Date().toISOString() })
);

app.get('/healthz/db', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.get('/healthz/redis', async (_req, res) => {
  try {
    await redis.ping();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

/* ---------- routes ---------- */
app.use('/api', ordersRouter);
app.use('/api', driversRouter);
app.use('/api', jobsRouter); // comment if jobs router not present

/* ---------- 404 & errors ---------- */
app.use((req, res) => {
  res.status(404).json({ ok: false, error: 'not_found', path: req.originalUrl });
});

app.use((err, _req, res, _next) => {
  // central error catcher so server never crashes on throw
  log.error({ err }, 'unhandled_error');
  res.status(500).json({ ok: false, error: 'internal_error' });
});

/* ---------- start ---------- */
const server = app.listen(PORT, () => {
  log.info(`API running on http://localhost:${PORT}`);
  // quick boot-time checks (non-fatal)
  prisma
    .$queryRaw`SELECT 1`
    .then(() => log.info('DB OK'))
    .catch(e => log.warn({ err: e }, 'DB check failed'));
  redis
    .ping()
    .then(() => log.info('Redis OK'))
    .catch(e => log.warn({ err: e }, 'Redis check failed'));
});

/* ---------- graceful shutdown ---------- */
const shutdown = async (signal) => {
  try {
    log.info({ signal }, 'shutting_down');
    server.close(() => log.info('http server closed'));
    try { await prisma.$disconnect(); } catch {}
    try { await redis.quit(); } catch {}
  } finally {
    process.exit(0);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
