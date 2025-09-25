const { availableByDriver, availableByCoords, acceptJob } = require('./jobs.service');

const list = async (req,res)=>{
  if (req.query.driverId) {
    const driverId = req.query.driverId;
    const radiusKm = Number(req.query.radiusKm || 5);
    const data = await availableByDriver(driverId, radiusKm);
    return res.json(data);
  }
  const { lat,lng,radiusKm } = req.query;
  const data = await availableByCoords(Number(lat),Number(lng),Number(radiusKm||5));
  res.json(data);
};

const accept = async (req,res)=>{
  const { id } = req.params;
  const { driverId } = req.body;
  const job = await acceptJob(id, driverId);
  res.json({ ok:true, job });
};

module.exports = { list, accept };
