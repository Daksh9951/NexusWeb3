# NexusWeb3 - Interactive Web3 & Layer 2 Educational Hub

An interactive, responsive Single Page Application (SPA) designed to educate users on the core fundamentals of Web3, cryptography, smart contracts, and Layer 2 scaling mechanics. Built entirely with Vanilla HTML, CSS, and modern JavaScript (ES6).

---

## 🚀 How to Run the Project Locally

Since the project is built with clean vanilla web technologies, there are no dependencies to install or complex compilation steps.

### Option A: Open directly in your browser
Simply locate the project folder and double-click the `index.html` file to open it directly in any modern web browser.

### Option B: Run a simple local server (Recommended)
To run a local server for smooth routing and asset loading:

**Using Node.js:**
```bash
# Install static server globally
npm install -g serve

# Run server inside the project root directory
serve .
```

**Using Python:**
```bash
# Python 3
python -m http.server 8000
```
Then navigate to `http://localhost:8000` (or the port specified by `serve`) in your browser.

---

## 📁 Pages & Features

The website is structured as a client-side Single Page Application utilizing a hash router (`#/`) for instantaneous, zero-refresh transitions and state persistence.

### 1. **Home / L2 Scaling (`#/`)**
- Explains the necessity of Layer 2 scaling, Optimistic Rollups, and transaction compression.
- Features dynamic network statistics and a visual Orbit animation depicting transaction rollup batches from L2 to L1.
- Links features directly to the Concepts and Simulator pages for a cohesive learning flow.

### 2. **Concepts (`#/concepts`)**
- High-fidelity educational reference page using side-by-side comparison tables.
- **Visual Concepts Covered**:
  - Web2 vs. Web3 (Platform-owned data vs. user-owned self-custodial protocols)
  - Ethereum vs. Bitcoin (Programmable global contracts vs. digital store of value)
  - Public Keys vs. Private Keys (Cryptographic identity vs. spend signatures)
  - Blockchains vs. Traditional Databases (Consensus-driven append-only vs. centralized CRUD admin)
  - Smart Contracts vs. Digital Agreements (Automated code execution vs. manual document enforcement)
  - Fungible vs. Non-Fungible Tokens (Interchangeable assets vs. unique ownership certificates)
- **Keypair Cryptographic Simulator**: Allows users to generate a private-public key pair, sign mock transaction messages, and instantly check signature verification or tampering mismatches.
- **Randomized Knowledge Quiz**: Shuffles a pool of 10 comprehensive Web3 questions on start or restart using a Fisher-Yates randomization algorithm.
- **Quick Reference Glossary**: 8 interactive grid cards covering Blockchain, Web Evolution, DeFi, L1 & L2 layers, Cryptography, Smart Contracts, DAOs, and Consensus mechanisms.

### 3. **Live Prices (`#/prices`)**
- Fetches real-time price feeds for **25 leading cryptocurrencies** from the public CoinGecko API.
- Displays price in USD, 24-hour price change percentage, and dynamic mini sparklines generated from historical trends.
- Includes instantaneous search filtering.
- **Resilience Fallback**: If rate-limited (HTTP 429) or offline, the page displays a status warning banner and immediately falls back to a simulated cache feed to preserve usability.

### 4. **Interactive Sandbox (`#/simulator`)**
A comprehensive 9-tab blockchain simulator that maps real Web3 protocols:
1.  **SHA-256 Hash**: Demonstrates deterministic, one-way hashes and the avalanche effect.
2.  **Single Block**: A block structure showcasing nonce-based Proof of Work difficulty.
3.  **Block Mining**: Multiple linked blocks. Modifying historic block data triggers a cascading invalidation that requires sequential re-mining of subsequent blocks.
4.  **Distributed Ledger**: Replicates chains across Peer A, Peer B, and Peer C. Displays a **Live Network Consensus Banner** that checks block validation and reports synchronization breaches.
5.  **Tokens**: Simulates transactional data inputs (value, sender, receiver) mapped to block hashes.
6.  **Coinbase balances**: Calculates real-time account balances, coin minting payouts, and double-spend prevention checks.
7.  **L2 Bridge**: Simulates token lock/unlock mechanisms when depositing or withdrawing ETH between L1 and L2.
8.  **Smart Contracts**: Features an interactive Solidity compiler and deployer, enabling users to call functions like `mint()` or `transfer()`, write transaction blocks to the chain, and query logs.
9.  **Gas Calculator**: Estimator converting gas units, prices (Gwei), and network limits into real USD/ETH costs.

---

## 🛠️ Tech Stack

- **Frontend**: Vanilla HTML5, CSS3, modern ES6 JavaScript.
- **APIs**: CoinGecko API (vs_currency=usd).
- **Cryptography**: Web Crypto API (SubtleCrypto SHA-256 hash digests).

---

## ⚠️ Known Issues & Potential Improvements

1.  **Mining Execution Threading**:
    *   *Issue*: Running block mining at high difficulties (e.g. 5 leading zeros) runs synchronously on the browser's main thread, occasionally causing minor frame stutters.
    *   *Improvement*: Move the hashing loop to a background Web Worker thread to keep the UI perfectly responsive.
2.  **Mock Solidity Custom compilation**:
    *   *Issue*: The Solidity code editor runs on a pre-defined set of ERC-20 mappings rather than compiling arbitrary Solidity files.
    *   *Improvement*: Integrate a WASM-compiled Solc compiler to validate and compile custom user smart contracts in the browser.
