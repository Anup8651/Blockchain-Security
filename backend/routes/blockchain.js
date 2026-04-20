const express = require('express');
const router = express.Router();
const { blockchain } = require('../utils/blockchain');
const { ThreatDetector } = require('../utils/crypto-utils');
const { authMiddleware } = require('../middleware/auth');

// GET /api/blockchain - Get full chain
router.get('/', (req, res) => {
  res.json({
    success: true,
    chain: blockchain.chain,
    stats: blockchain.getStats()
  });
});

// GET /api/blockchain/stats
router.get('/stats', (req, res) => {
  res.json({ success: true, stats: blockchain.getStats() });
});

// GET /api/blockchain/validate
router.get('/validate', (req, res) => {
  const isValid = blockchain.isChainValid();
  res.json({
    success: true,
    isValid,
    message: isValid ? 'Blockchain integrity verified ✓' : 'Blockchain has been tampered with!'
  });
});

// POST /api/blockchain/add-block - Add a new block (protected)
router.post('/add-block', authMiddleware, (req, res) => {
  const { data } = req.body;
  if (!data) return res.status(400).json({ error: 'Block data is required' });

  const block = blockchain.addBlock({
    ...data,
    addedBy: req.user.address || req.user.username,
    type: data.type || 'custom'
  });

  res.json({ success: true, block });
});

// POST /api/blockchain/transaction - Add transaction
router.post('/transaction', authMiddleware, (req, res) => {
  const { to, amount, token } = req.body;
  if (!to || !amount) return res.status(400).json({ error: 'Missing required fields: to, amount' });

  const transaction = { from: req.user.address || req.user.username, to, amount, token: token || 'ETH' };
  const threatAnalysis = ThreatDetector.analyzeTransaction(transaction);

  if (!threatAnalysis.approved) {
    return res.status(403).json({
      error: 'Transaction blocked by security analysis',
      threatAnalysis
    });
  }

  const index = blockchain.addTransaction(transaction);
  res.json({
    success: true,
    message: `Transaction added to pending pool (index: ${index})`,
    threatAnalysis,
    transaction
  });
});

// POST /api/blockchain/mine - Mine pending transactions
router.post('/mine', authMiddleware, (req, res) => {
  const pending = blockchain.pendingTransactions.length;
  if (pending === 0) return res.status(400).json({ error: 'No pending transactions to mine' });

  const minerAddress = req.user.address || req.user.username;
  const block = blockchain.minePendingTransactions(minerAddress);

  res.json({
    success: true,
    message: `Block mined! ${pending} transactions confirmed.`,
    block,
    reward: 10
  });
});

// GET /api/blockchain/pending
router.get('/pending', authMiddleware, (req, res) => {
  res.json({
    success: true,
    pendingTransactions: blockchain.pendingTransactions,
    count: blockchain.pendingTransactions.length
  });
});

module.exports = router;
