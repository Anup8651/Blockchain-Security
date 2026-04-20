const crypto = require('crypto');

class Wallet {
  constructor() {
    const { privateKey, publicKey } = this.generateKeyPair();
    this.privateKey = privateKey;
    this.publicKey = publicKey;
    this.address = this.generateAddress(publicKey);
    this.balance = 0;
    this.createdAt = new Date().toISOString();
  }

  generateKeyPair() {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'secp256k1',
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    return { privateKey, publicKey };
  }

  generateAddress(publicKey) {
    const hash = crypto.createHash('sha256').update(publicKey).digest('hex');
    const ripemd = crypto.createHash('ripemd160').update(hash).digest('hex');
    return '0x' + ripemd.substring(0, 40);
  }

  signTransaction(data) {
    const sign = crypto.createSign('SHA256');
    sign.update(JSON.stringify(data));
    sign.end();
    return sign.sign(this.privateKey, 'hex');
  }

  static verifySignature(publicKey, data, signature) {
    try {
      const verify = crypto.createVerify('SHA256');
      verify.update(JSON.stringify(data));
      verify.end();
      return verify.verify(publicKey, signature, 'hex');
    } catch {
      return false;
    }
  }

  toPublicJSON() {
    return {
      address: this.address,
      publicKey: this.publicKey,
      balance: this.balance,
      createdAt: this.createdAt
    };
  }
}

// Threat detection utility
class ThreatDetector {
  static analyzeTransaction(transaction) {
    const risks = [];
    let riskScore = 0;

    if (transaction.amount > 10000) {
      risks.push({ type: 'LARGE_TRANSACTION', severity: 'medium', message: 'Transaction amount exceeds $10,000' });
      riskScore += 30;
    }

    if (transaction.from === transaction.to) {
      risks.push({ type: 'SELF_TRANSFER', severity: 'high', message: 'Sender and receiver are the same address' });
      riskScore += 50;
    }

    if (!transaction.from || !transaction.to) {
      risks.push({ type: 'MISSING_ADDRESS', severity: 'critical', message: 'Transaction missing address fields' });
      riskScore += 80;
    }

    return {
      riskScore: Math.min(riskScore, 100),
      riskLevel: riskScore < 20 ? 'low' : riskScore < 50 ? 'medium' : riskScore < 80 ? 'high' : 'critical',
      risks,
      approved: riskScore < 80
    };
  }

  static hashData(data) {
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
  }

  static generateNonce() {
    return crypto.randomBytes(32).toString('hex');
  }
}

module.exports = { Wallet, ThreatDetector };
