// middlewares/auth.js
module.exports = function apiKeyAuth(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!key) return res.status(401).json({ error: 'missing_api_key' });
  if (key !== process.env.API_KEY) return res.status(403).json({ error: 'invalid_api_key' });
  next();
};
