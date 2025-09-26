// server.js
require('dotenv').config();
const app = require('./app');

const port = Number(process.env.PORT) || 4000;
const host = process.env.HOST || '0.0.0.0'; 
const server = app.listen(port, host, () => {
  const localUrl = `http://localhost:${port}`;
  const hostUrl  = `http://${host}:${port}`;

  console.log(`HTTP listening on ${hostUrl}`);
  console.log(`Local:  ${localUrl}`);      
});

['SIGINT','SIGTERM'].forEach(sig => process.on(sig, () => server.close(() => process.exit(0))));
