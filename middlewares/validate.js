module.exports.validate = (schema, prop='body') => (req, res, next) => {
  try { req[prop] = schema.parse(req[prop]); next(); }
  catch (e) { res.status(400).json({ error: 'validation_error', details: e.errors }); }
};
