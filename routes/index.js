const { Router } = require('express');
const orders = require('../modules/orders/orders.router');
const drivers = require('../modules/drivers/drivers.router');
const jobs = require('../modules/jobs/jobs.router');
const system = require('../modules/system/system.router');

const r = Router();
r.use('/orders', orders);
r.use('/drivers', drivers);
r.use('/jobs', jobs);
r.use('/', system);

module.exports = r;
