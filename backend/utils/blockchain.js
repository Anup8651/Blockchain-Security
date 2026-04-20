const crypto = require('crypto');

class Block {
  constructor(index, timestamp, data, previousHash = '') {
    this.index = index;
    this.timestamp = timestamp;
    this.data = data;
    this.previousHash = previousHash;
    this.nonce = 0;
    this.hash = this.calculateHash();
  }

  calculateHash() {
    return crypto
      .createHash('sha256')
      .update(
        this.index +
        this.previousHash +
        this.timestamp +
        JSON.stringify(this.data) +
        this.nonce
      )
      .digest('hex');
  }

  mineBlock(difficulty) {
    const target = Array(difficulty + 1).join('0');
    while (this.hash.substring(0, difficulty) !== target) {
      this.nonce++;
      this.hash = this.calculateHash();
    }
    return this;
  }
}

class Blockchain {
  constructor() {
    this.chain = [this.createGenesisBlock()];
    this.difficulty = 3;
    this.pendingTransactions = [];
  }

  createGenesisBlock() {
    return new Block(0, new Date().toISOString(), {
      message: 'Genesis Block',
      type: 'genesis'
    }, '0');
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  addBlock(data) {
    const newBlock = new Block(
      this.chain.length,
      new Date().toISOString(),
      data,
      this.getLatestBlock().hash
    );
    newBlock.mineBlock(this.difficulty);
    this.chain.push(newBlock);
    return newBlock;
  }

  isChainValid() {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      const recalcHash = crypto
        .createHash('sha256')
        .update(
          currentBlock.index +
          currentBlock.previousHash +
          currentBlock.timestamp +
          JSON.stringify(currentBlock.data) +
          currentBlock.nonce
        )
        .digest('hex');

      if (currentBlock.hash !== recalcHash) return false;
      if (currentBlock.previousHash !== previousBlock.hash) return false;
    }
    return true;
  }

  addTransaction(transaction) {
    this.pendingTransactions.push({
      ...transaction,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString()
    });
    return this.pendingTransactions.length - 1;
  }

  minePendingTransactions(minerAddress) {
    const block = this.addBlock({
      type: 'transactions',
      transactions: this.pendingTransactions,
      miner: minerAddress,
      reward: 10
    });
    this.pendingTransactions = [];
    return block;
  }

  getStats() {
    return {
      totalBlocks: this.chain.length,
      pendingTransactions: this.pendingTransactions.length,
      isValid: this.isChainValid(),
      difficulty: this.difficulty,
      latestBlockHash: this.getLatestBlock().hash
    };
  }
}

// Singleton instance
const blockchain = new Blockchain();

// Seed with some initial data
blockchain.addBlock({ type: 'security_event', event: 'System Initialized', severity: 'info' });
blockchain.addBlock({ type: 'transaction', from: 'alice', to: 'bob', amount: 50, token: 'BTC' });

module.exports = { Blockchain, Block, blockchain };
