// service algo goes over here bumboclat

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { prisma } = require('../../lib/prisma');

function sign(user) {
  const payload = { sub: user.id, email: user.email, name: user.name || null };
  const opts = { expiresIn: process.env.JWT_EXPIRES || '7d' };
  return jwt.sign(payload, process.env.JWT_SECRET, opts);
}

async function register({ email, name, password }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const err = new Error('email_taken');
    err.status = 409;
    throw err;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { email, name, passwordHash } });
  const token = sign(user);
  return { user: { id: user.id, email: user.email, name: user.name }, token };
}

async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const err = new Error('invalid_credentials');
    err.status = 401;
    throw err;
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    const err = new Error('invalid_credentials');
    err.status = 401;
    throw err;
  }
  const token = sign(user);
  return { user: { id: user.id, email: user.email, name: user.name }, token };
}

module.exports = { register, login };
