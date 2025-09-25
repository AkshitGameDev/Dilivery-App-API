const { importOrder } = require('./orders.service');
const create = async (req,res)=> {
  const out = await importOrder(req.body, req.headers['idempotency-key']);
  res.json(out);
};
module.exports = { create };
