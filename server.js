require('dotenv').config();
const app = require('./app');
const { redis } = require('./lib/redis');
const port = process.env.PORT || 4000;
const server = app.listen(port, () => console.log(`HTTP on :${port}`));
['SIGINT','SIGTERM'].forEach(s=>process.on(s, async ()=>{ try{await redis.quit();}catch{} server.close(()=>process.exit(0)); }));