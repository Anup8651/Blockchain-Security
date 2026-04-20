# ⬡ BlockSecure — Blockchain Security Platform

A full-stack blockchain security application with real cryptography, threat analysis, and immutable ledger.

---

## 🚀 Quick Start

### 1. Install Backend Dependencies
```bash
cd backend
npm install
```

### 2. Setup Environment
```bash
cp .env.example .env
# Edit .env and set a strong JWT_SECRET
```

### 3. Start the Server
```bash
npm start
# OR for development with auto-reload:
npm run dev
```

### 4. Open the Frontend
The frontend is served automatically at:
```
http://localhost:3001
```

Or open `frontend/index.html` directly in your browser (set API to the backend URL).

---

## 🏗 Project Structure

```
blockchain-security/
├── backend/
│   ├── server.js              # Express server + security middleware
│   ├── package.json
│   ├── .env.example
│   ├── middleware/
│   │   └── auth.js            # JWT auth middleware
│   ├── routes/
│   │   ├── auth.js            # Login, register, wallet, hashing
│   │   └── blockchain.js      # Chain, blocks, transactions, mining
│   └── utils/
│       ├── blockchain.js      # Block + Blockchain classes
│       └── crypto-utils.js    # Wallet + ThreatDetector
└── frontend/
    ├── index.html             # Single-page app
    ├── css/style.css          # Cyberpunk design system
    └── js/app.js              # API calls + UI logic
```

---

## 🔒 Security Features

| Feature | Implementation |
|---|---|
| Password hashing | bcrypt (12 rounds) |
| Authentication | JWT (24h expiry) |
| Key pairs | EC secp256k1 (same as Bitcoin/Ethereum) |
| Hashing | SHA-256 + RIPEMD-160 |
| Block integrity | SHA-256 chaining |
| HTTP security | Helmet.js headers |
| Rate limiting | 200 req / 15 min |
| CORS | Whitelist only |

---

## 📡 API Endpoints

### Auth
- `POST /api/auth/register` — Create account + wallet
- `POST /api/auth/login` — Login, receive JWT
- `GET  /api/auth/me` — Get current user (auth required)
- `POST /api/auth/generate-wallet` — Generate EC keypair
- `POST /api/auth/hash` — SHA-256 hash any data
- `POST /api/auth/analyze-threat` — Analyze transaction risk

### Blockchain
- `GET  /api/blockchain` — Full chain + stats
- `GET  /api/blockchain/stats` — Live network stats
- `GET  /api/blockchain/validate` — Verify chain integrity
- `POST /api/blockchain/add-block` — Mine a custom block (auth)
- `POST /api/blockchain/transaction` — Add transaction (auth)
- `POST /api/blockchain/mine` — Mine pending transactions (auth)
- `GET  /api/blockchain/pending` — View pending pool (auth)

---

## ⛏ How the Blockchain Works

1. **Genesis Block** is created on server start
2. Each block contains: index, timestamp, data, previousHash, nonce, hash
3. **Mining** = finding a nonce so `hash.startsWith('000')` (difficulty 3)
4. Chain integrity verified by re-hashing every block
5. Transactions go to a **pending pool** until mined into a block

---

## 🛡 Threat Detection Rules

| Condition | Risk Level | Score |
|---|---|---|
| Amount > $10,000 | Medium | +30 |
| Self-transfer | High | +50 |
| Missing address | Critical | +80 |
| Score ≥ 80 | BLOCKED | — |

---

## 🧑‍💻 Tech Stack

**Backend:** Node.js, Express, bcryptjs, jsonwebtoken, helmet, express-rate-limit  
**Frontend:** Vanilla HTML/CSS/JS (no framework needed)  
**Crypto:** Node.js built-in `crypto` module (no external deps)
