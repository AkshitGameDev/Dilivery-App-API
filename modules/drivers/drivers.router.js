const { Router } = require('express');
const { validate } = require('../../middlewares/validate');
const { asyncH } = require('../../middlewares/async');
const { hbSchema } = require('./drivers.validator');
const { postHeartbeat } = require('./drivers.controller');

const r = Router();
r.post('/heartbeat', validate(hbSchema), asyncH(postHeartbeat));
module.exports = r;
