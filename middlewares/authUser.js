// middlewares/authUser.js
const jwt = require('jsonwebtoken');

module.exports = function authUser(req, res, next) {
  const bearer = req.headers.authorization;
  const cookieToken = req.cookies?.token;
  const token = cookieToken || (bearer?.startsWith('Bearer ') ? bearer.slice(7) : undefined);
  if (!token) return res.status(401).json({ error: 'unauthorized' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.sub, email: payload.email, name: payload.name || null };
    next();
  } catch {
    return res.status(401).json({ error: 'invalid_token' });
  }
};
