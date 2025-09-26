const { z } = require('zod');

const email = z.string().email();
const password = z.string().min(6);

const registerSchema = z.object({
  email,
  name: z.string().min(1).optional(),
  password
});

const loginSchema = z.object({
  email,
  password
});

module.exports = { registerSchema, loginSchema };
