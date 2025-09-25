const { Router } = require('express');
const { asyncH } = require('../../middlewares/async');
const { validate } = require('../../middlewares/validate');
const { acceptSchema } = require('./jobs.validator');
const { list, accept } = require('./jobs.controller');

const r = Router();
r.get('/available', asyncH(list));
r.post('/:id/accept', validate(acceptSchema), asyncH(accept));
module.exports = r;
