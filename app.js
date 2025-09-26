// app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const pinoHttp = require('pino-http');
const cookieParser = require('cookie-parser');

const routes = require('./routes'); // /orders, /drivers, /jobs
const systemRouter = require('./modules/system/system.router'); // /healthz...
const authRouter = require('./modules/auth/auth.router');       // /api/auth/*
const apiKeyAuth = require('./middlewares/auth');               // x-api-key check
const { notFound, errorHandler } = require('./middlewares/error');

const app = express();
app.set('trust proxy', true);

// Security + logging
app.use(helmet());
app.use(
  pinoHttp({
    autoLogging: true,
    redact: ['req.headers.authorization'],
  })
);

// CORS + body + cookies
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Root + health (no auth)
app.get('/', (_, res) => res.status(200).json({ ok: true, service: 'Delivery-App-API' }));
app.use('/', systemRouter);

// Auth routes (public: register, login, me, logout)
app.use('/api/auth', authRouter);

// All other API routes require x-api-key
app.use('/api', apiKeyAuth, routes);

// 404 + error handlers
app.use(notFound);
app.use(errorHandler);

module.exports = app;
