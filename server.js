// server.js
require('dotenv').config();
const app = require('./app');

const port = Number(process.env.PORT) || 4000;
const host = process.env.HOST || '0.0.0.0'; // keep 0.0.0.0 so it works in Docker/Render

const server = app.listen(port, host, () => {
  const localUrl = `http://localhost:${port}`;
  const hostUrl  = `http://${host}:${port}`;

  console.log(`HTTP listening on ${hostUrl}`);
  console.log(`Local:  ${localUrl}`);      // <- clickable in most terminals
});

['SIGINT','SIGTERM'].forEach(sig => process.on(sig, () => server.close(() => process.exit(0))));
