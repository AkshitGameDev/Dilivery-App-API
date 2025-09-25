const { Router } = require('express');
const { validate } = require('../../middlewares/validate');
const { asyncH } = require('../../middlewares/async');
const { orderSchema } = require('./orders.validator');
const { create } = require('./orders.controller');

const r = Router();
r.post('/import-orders', validate(orderSchema), asyncH(create));
module.exports = r;
