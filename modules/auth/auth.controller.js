const { register, login } = require('./auth.service');

const cookieOpts = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/'
};

const postRegister = async (req, res) => {
  const { user, token } = await register(req.body);
  res
    .cookie('token', token, { ...cookieOpts })
    .status(201)
    .json({ user });
};

const postLogin = async (req, res) => {
  const { user, token } = await login(req.body);
  res
    .cookie('token', token, { ...cookieOpts })
    .json({ user });
};

const postLogout = async (_req, res) => {
  res.clearCookie('token', { path: '/' }).json({ ok: true });
};

const getMe = async (req, res) => {
  res.json({ user: req.user });
};

module.exports = { postRegister, postLogin, postLogout, getMe };
