// app.js
const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middlewares/error');

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());
app.get('/', (_,res)=>res.json({ok:true, service:'Delivery-App-API'})); // optional root
app.use('/api', routes);
app.use(notFound);
app.use(errorHandler);
module.exports = app;
