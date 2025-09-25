const { heartbeat } = require('./drivers.service');
const postHeartbeat = async (req,res)=> res.json(await heartbeat(req.body));
module.exports = { postHeartbeat };
