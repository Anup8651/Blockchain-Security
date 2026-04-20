const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { Wallet, ThreatDetector } = require('../utils/crypto-utils');
const { generateToken, authMiddleware } = require('../middleware/auth');

// In-memory user store (use a real DB in production)
const users = new Map();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  if (users.has(username)) return res.status(409).json({ error: 'Username already exists' });

  const hashedPassword = await bcrypt.hash(password, 12);
  const wallet = new Wallet();

  users.set(username, {
    username,
    password: hashedPassword,
    wallet,
    createdAt: new Date().toISOString()
  });

  const token = generateToken({ username, address: wallet.address });

  res.status(201).json({
    success: true,
    message: 'Account created successfully',
    token,
    user: { username, wallet: wallet.toPublicJSON() }
  });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  const user = users.get(username);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = generateToken({ username, address: user.wallet.address });

  res.json({
    success: true,
    token,
    user: { username, wallet: user.wallet.toPublicJSON() }
  });
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
  const user = users.get(req.user.username);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ success: true, user: { username: user.username, wallet: user.wallet.toPublicJSON() } });
});

// POST /api/auth/generate-wallet
router.post('/generate-wallet', (req, res) => {
  const wallet = new Wallet();
  res.json({ success: true, wallet: wallet.toPublicJSON() });
});

// POST /api/auth/analyze-threat
router.post('/analyze-threat', (req, res) => {
  const { transaction } = req.body;
  if (!transaction) return res.status(400).json({ error: 'Transaction data required' });
  const analysis = ThreatDetector.analyzeTransaction(transaction);
  res.json({ success: true, analysis });
});

// GET /api/auth/hash
router.post('/hash', (req, res) => {
  const { data } = req.body;
  if (!data) return res.status(400).json({ error: 'Data required' });
  const hash = ThreatDetector.hashData(data);
  const nonce = ThreatDetector.generateNonce();
  res.json({ success: true, hash, nonce, algorithm: 'SHA-256' });
});

module.exports = router;
