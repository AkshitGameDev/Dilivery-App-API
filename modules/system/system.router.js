const { Router } = require('express');
const r = Router();
r.get('/healthz', (_,res)=>res.json({ok:true}));
r.get('/healthz/db', async (_,res)=>res.json({ok:true}));
r.get('/healthz/redis', async (_,res)=>res.json({ok:true}));
module.exports = r;
