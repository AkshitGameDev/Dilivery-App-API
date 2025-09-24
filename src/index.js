import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pino from 'pino';

const app = express();
const log = pino({ name: 'pilotx-api' });
const PORT = process.env.PORT || 4000;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/healthz', (req, res) => {
  res.json({ ok: true, service: 'pilotx-api', ts: new Date().toISOString() });
});

app.listen(PORT, () => log.info(`API running on http://localhost:${PORT}`));
