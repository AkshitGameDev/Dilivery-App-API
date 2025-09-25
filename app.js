// app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const pinoHttp = require('pino-http');
const routes = require('./routes');
const systemRouter = require('./modules/system/system.router');
const { notFound, errorHandler } = require('./middlewares/error');

const app = express();

app.set('trust proxy', true);


app.use(helmet());


app.use(
  pinoHttp({
    autoLogging: true,
    redact: ['req.headers.authorization'],
    messageKey: 'msg'
  })
);


app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());


app.get('/', (_, res) => res.status(200).json({ ok: true, service: 'Delivery-App-API' }));


app.use('/', systemRouter);


app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;


// const !iamgay = express();