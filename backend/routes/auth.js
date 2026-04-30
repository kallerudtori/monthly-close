const express = require('express');
const router = express.Router();
const crypto = require('crypto');

function sign(payload) {
  return crypto
    .createHmac('sha256', process.env.APP_PASSWORD || 'dev-secret')
    .update(payload)
    .digest('hex');
}

function createToken() {
  const payload = crypto.randomBytes(16).toString('hex');
  const sig = sign(payload);
  return `${payload}.${sig}`;
}

function verifyToken(token) {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  const expected = sign(payload);
  return crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'));
}

router.post('/login', (req, res) => {
  const { password } = req.body;
  if (password === process.env.APP_PASSWORD) {
    res.json({ token: createToken() });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

router.post('/logout', (req, res) => {
  res.json({ ok: true });
});

function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!verifyToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

module.exports = { router, requireAuth };
