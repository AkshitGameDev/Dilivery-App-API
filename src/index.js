import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pino from 'pino';

import { prisma } from './db.js';
import { redis } from './redis.js';

// ✅ rename imports so names don't clash
import driversRouter from './routes/drivers.js';
import jobsRouter from './routes/jobs.js'; // if you added jobs

const app = express();
const log = pino({ name: 'pilotx-api' });
const PORT = process.env.PORT || 4000;

app.use(helmet());
app.use(cors());
app.use(express.json()); // must be before app.use('/api', ...)

app.get('/healthz', (_req, res) => {
  res.json({ ok: true, service: 'pilotx-api', ts: new Date().toISOString() });
});
app.get('/', (_req, res) => {
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

// 🔗 register routes once
app.use('/api', driversRouter);
app.use('/api', jobsRouter); // remove if you don't have jobs yet

app.listen(PORT, () => log.info(`API running on http://localhost:${PORT}`));
