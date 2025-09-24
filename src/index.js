import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pino from 'pino';

import { prisma } from './db.js';
import { redis } from './redis.js';
import ordersRouter from './routes/orders.js';
import driversRouter from './routes/drivers.js';
import jobsRouter from './routes/jobs.js'; // if you don't have this yet, delete this line + its app.use

const app = express();
const log = pino({ name: 'pilotx-api' });
const PORT = process.env.PORT || 4000;

// middleware (must come BEFORE routes)
app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ ok: true, service: 'pilotx-api', ts: new Date().toISOString() });
});
app.get('/healthz', (_req, res) => {
  res.json({ ok: true, service: 'pilotx-api', ts: new Date().toISOString() });
});
app.get('/healthz/db', async (_req, res) => {
  try { await prisma.$queryRaw`SELECT 1`; res.json({ ok: true }); }
  catch (e) { res.status(500).json({ ok: false, error: String(e) }); }
});
app.get('/healthz/redis', async (_req, res) => {
  try { await redis.ping(); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ ok: false, error: String(e) }); }
});

// routes (register ONCE)
app.use('/api', ordersRouter);
app.use('/api', driversRouter);
app.use('/api', jobsRouter); // remove if jobsRouter not created yet

app.listen(PORT, () => log.info(`API running on http://localhost:${PORT}`));
