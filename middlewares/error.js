const notFound = (req,res)=> res.status(404).json({error:'not_found', path:req.originalUrl});
const errorHandler = (err,req,res,next)=>{
  console.error(err);
  if (err.status) return res.status(err.status).json({error:err.code||'error', message:err.message});
  res.status(500).json({error:'internal'});
};
module.exports = { notFound, errorHandler };
