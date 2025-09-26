const { Router } = require('express');
const cookieParser = require('cookie-parser');
const { validate } = require('../../middlewares/validate');
const { asyncH } = require('../../middlewares/async');
const { registerSchema, loginSchema } = require('./auth.validator');
const { postRegister, postLogin, postLogout, getMe } = require('./auth.controller');
const authUser = require('../../middlewares/authUser');

const r = Router();

r.use(cookieParser());

r.post('/register', validate(registerSchema), asyncH(postRegister));
r.post('/login', validate(loginSchema), asyncH(postLogin));
r.post('/logout', asyncH(postLogout));

r.get('/me', authUser, asyncH(getMe));

module.exports = r;
