/**
 * NexusWeb3 - app.js
 * Contains client-side routing, CoinGecko price feed, 
 * Web Worker block mining simulator, mock wallet connection,
 * L2 Bridge pipeline, Smart Contract sandbox, and Gas calculator.
 */

// ----------------------------------------------------
// CRYPTOGRAPHIC UTILITIES
// ----------------------------------------------------

/**
 * Computes the SHA-256 hash of a string using the browser's native Web Crypto API.
 * @param {string} text - The input text to hash.
 * @returns {Promise<string>} - The hexadecimal SHA-256 hash.
 */
async function sha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// ----------------------------------------------------
// GLOBAL APPLICATION STATE
// ----------------------------------------------------
const walletState = {
  connected: true,
  address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
  network: 'arbitrum', // 'ethereum' or 'arbitrum'
  balances: {
    ethereum: { ETH: 10.00, USDC: 1000.00 },
    arbitrum: { ETH: 0.50, USDC: 0.00 }
  },
  nxtBalances: {
    '0x71C7656EC7ab88b098defB751B7401B5f6d8976F': 0.00
  }, // Address to NXT token balance mapping
  nxtTotalSupply: 0,
  contractDeployed: false,
  contractAddress: ''
};

// ----------------------------------------------------
// ROUTER & NAVIGATION SYSTEM
// ----------------------------------------------------

const routes = {
  '/': { viewId: 'home-page', navId: 'nav-home' },
  '/concepts': { viewId: 'concepts-page', navId: 'nav-concepts' },
  '/prices': { viewId: 'prices-page', navId: 'nav-prices' },
  '/simulator': { viewId: 'simulator-page', navId: 'nav-simulator', subTab: 'simulator-block-mining' },
  '/bridge': { viewId: 'simulator-page', navId: 'nav-simulator', subTab: 'bridge-page' },
  '/contracts': { viewId: 'simulator-page', navId: 'nav-simulator', subTab: 'contracts-page' },
  '/gas': { viewId: 'simulator-page', navId: 'nav-simulator', subTab: 'gas-page' },
  '/hash': { viewId: 'simulator-page', navId: 'nav-simulator', subTab: 'simulator-hash' },
  '/block': { viewId: 'simulator-page', navId: 'nav-simulator', subTab: 'simulator-block' },
  '/distributed': { viewId: 'simulator-page', navId: 'nav-simulator', subTab: 'simulator-distributed' },
  '/tokens': { viewId: 'simulator-page', navId: 'nav-simulator', subTab: 'simulator-tokens' },
  '/coinbase': { viewId: 'simulator-page', navId: 'nav-simulator', subTab: 'simulator-coinbase' }
};

/**
 * Handles client-side Single Page Application (SPA) routing based on hash anchors.
 */
function handleRouting() {
  const rawHash = window.location.hash || '#/';
  const routePath = rawHash.replace(/^#/, '');
  
  // Resolve view, defaulting to home if unmatched
  const route = routes[routePath] || routes['/'];
  
  // Update active page view class
  document.querySelectorAll('.page-view').forEach(view => {
    view.classList.remove('active');
  });
  const activeView = document.getElementById(route.viewId);
  if (activeView) {
    activeView.classList.add('active');
  }
  
  // Handle sub-tabs within simulator page if view is simulator-page
  if (route.viewId === 'simulator-page') {
    const activeSubTab = route.subTab || 'simulator-block-mining';
    
    // Toggle tab panels
    document.querySelectorAll('.sim-tab-content').forEach(panel => {
      panel.style.display = 'none';
    });
    const activePanel = document.getElementById(activeSubTab);
    if (activePanel) {
      activePanel.style.display = 'block';
    }

    // Toggle sub-navigation buttons active states
    document.querySelectorAll('.sim-tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    
    let btnId = 'sim-tab-btn-block-mining';
    if (activeSubTab === 'bridge-page') btnId = 'sim-tab-btn-bridge';
    else if (activeSubTab === 'contracts-page') btnId = 'sim-tab-btn-contracts';
    else if (activeSubTab === 'gas-page') btnId = 'sim-tab-btn-gas';
    else if (activeSubTab === 'simulator-hash') btnId = 'sim-tab-btn-hash';
    else if (activeSubTab === 'simulator-block') btnId = 'sim-tab-btn-block';
    else if (activeSubTab === 'simulator-distributed') btnId = 'sim-tab-btn-distributed';
    else if (activeSubTab === 'simulator-tokens') btnId = 'sim-tab-btn-tokens';
    else if (activeSubTab === 'simulator-coinbase') btnId = 'sim-tab-btn-coinbase';
    
    const activeBtn = document.getElementById(btnId);
    if (activeBtn) {
      activeBtn.classList.add('active');
    }
  }

  // Update navigation highlighting
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });
  const activeNavItem = document.getElementById(route.navId);
  if (activeNavItem) {
    activeNavItem.classList.add('active');
  }

  // Smooth scroll to top on navigation
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Close mobile navigation drawer if open
  const navLinks = document.getElementById('nav-links');
  if (navLinks) {
    navLinks.classList.remove('mobile-open');
  }

  // Trigger page-specific loaders
  if (route.viewId === 'prices-page') {
    fetchPrices();
  } else if (route.viewId === 'simulator-page') {
    initSimulator();
    
    const activeSubTab = route.subTab || 'simulator-block-mining';
    if (activeSubTab === 'bridge-page') {
      initBridgePage();
    } else if (activeSubTab === 'contracts-page') {
      initContractsPage();
    } else if (activeSubTab === 'gas-page') {
      initGasPage();
    } else if (activeSubTab === 'simulator-hash') {
      initHashTab();
    } else if (activeSubTab === 'simulator-block') {
      initBlockTab();
    } else if (activeSubTab === 'simulator-distributed') {
      initDistributedTab();
    } else if (activeSubTab === 'simulator-tokens') {
      initTokensTab();
    } else if (activeSubTab === 'simulator-coinbase') {
      initCoinbaseTab();
    }
  }
}

// Global initialization listeners
document.addEventListener('DOMContentLoaded', () => {
  const menuToggle = document.getElementById('menu-toggle');
  const navLinks = document.getElementById('nav-links');

  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      navLinks.classList.toggle('mobile-open');
    });
  }

  // Handle initial page load and history hash changes
  window.addEventListener('hashchange', handleRouting);
  handleRouting();
  initFAQ();
  initComparisonHover();
  initWalletListeners();
});

/**
 * Initializes synchronized row highlighting in comparison tables using event delegation.
 */
function initComparisonHover() {
  document.addEventListener('mouseover', (e) => {
    const row = e.target.closest('.comparison-row');
    if (!row) return;
    const compareKey = row.getAttribute('data-compare');
    if (!compareKey) return;
    
    document.querySelectorAll(`.comparison-row[data-compare="${compareKey}"]`).forEach(el => {
      el.classList.add('highlighted-row');
    });
  });

  document.addEventListener('mouseout', (e) => {
    const row = e.target.closest('.comparison-row');
    if (!row) return;
    const compareKey = row.getAttribute('data-compare');
    if (!compareKey) return;
    
    document.querySelectorAll(`.comparison-row[data-compare="${compareKey}"]`).forEach(el => {
      el.classList.remove('highlighted-row');
    });
  });
}

/**
 * Smoothly animates expansion/collapse of the FAQ <details> elements.
 */
function initFAQ() {
  document.querySelectorAll('.faq-item').forEach(details => {
    const summary = details.querySelector('.faq-summary');
    const content = details.querySelector('.faq-content');
    if (!summary || !content) return;
    
    summary.addEventListener('click', (e) => {
      e.preventDefault();
      
      // If already open, animate closing
      if (details.hasAttribute('open')) {
        const startHeight = content.scrollHeight;
        content.style.height = `${startHeight}px`;
        content.style.opacity = '1';
        
        // Force reflow
        content.offsetHeight;
        
        content.style.transition = 'height 0.35s cubic-bezier(0.4, 0, 0.2, 1), padding 0.35s ease, opacity 0.3s ease';
        content.style.height = '0px';
        content.style.opacity = '0';
        content.style.paddingTop = '0px';
        content.style.paddingBottom = '0px';
        
        setTimeout(() => {
          if (details.hasAttribute('open')) {
            details.removeAttribute('open');
          }
          content.removeAttribute('style');
        }, 350);
      } else {
        // Expand
        // Close other open details first for accordion effect
        document.querySelectorAll('.faq-item[open]').forEach(openDetails => {
          if (openDetails !== details) {
            const openContent = openDetails.querySelector('.faq-content');
            if (openContent) {
              openContent.style.height = `${openContent.scrollHeight}px`;
              openContent.offsetHeight;
              openContent.style.transition = 'height 0.35s cubic-bezier(0.4, 0, 0.2, 1), padding 0.35s ease, opacity 0.3s ease';
              openContent.style.height = '0px';
              openContent.style.opacity = '0';
              openContent.style.paddingTop = '0px';
              openContent.style.paddingBottom = '0px';
              setTimeout(() => {
                openDetails.removeAttribute('open');
                openContent.removeAttribute('style');
              }, 350);
            }
          }
        });

        details.setAttribute('open', '');
        const targetHeight = content.scrollHeight;
        content.style.height = '0px';
        content.style.opacity = '0';
        content.style.paddingTop = '0px';
        content.style.paddingBottom = '0px';
        
        // Force reflow
        content.offsetHeight;
        
        content.style.transition = 'height 0.35s cubic-bezier(0.4, 0, 0.2, 1), padding 0.35s ease, opacity 0.35s ease';
        content.style.height = `${targetHeight}px`;
        content.style.opacity = '1';
        content.style.paddingTop = '16px';
        content.style.paddingBottom = '24px';
        
        setTimeout(() => {
          content.removeAttribute('style');
        }, 350);
      }
    });
  });
}


// ----------------------------------------------------
// LIVE PRICES & COINGECKO API
// ----------------------------------------------------

let coinCache = [];
let bridgeMode = 'deposit';

// High fidelity fallback coin data in case CoinGecko API rate limits the request
const fallbackCoins = [
  {
    id: "bitcoin",
    symbol: "btc",
    name: "Bitcoin",
    image: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png",
    current_price: 63240.50,
    market_cap_rank: 1,
    price_change_percentage_24h: 1.84,
    sparkline_in_7d: {
      price: [62100, 62400, 61800, 62900, 63100, 62800, 63240]
    }
  },
  {
    id: "ethereum",
    symbol: "eth",
    name: "Ethereum",
    image: "https://assets.coingecko.com/coins/images/279/large/ethereum.png",
    current_price: 3450.75,
    market_cap_rank: 2,
    price_change_percentage_24h: -0.42,
    sparkline_in_7d: {
      price: [3520, 3490, 3460, 3480, 3440, 3470, 3450]
    }
  },
  {
    id: "solana",
    symbol: "sol",
    name: "Solana",
    image: "https://assets.coingecko.com/coins/images/4128/large/solana.png",
    current_price: 142.30,
    market_cap_rank: 5,
    price_change_percentage_24h: 4.12,
    sparkline_in_7d: {
      price: [135, 138, 136, 140, 142, 139, 142.3]
    }
  },
  {
    id: "polygon-ecosystem-token",
    symbol: "matic",
    name: "Polygon (MATIC)",
    image: "https://assets.coingecko.com/coins/images/4713/large/polygon.png",
    current_price: 0.565,
    market_cap_rank: 21,
    price_change_percentage_24h: -1.25,
    sparkline_in_7d: {
      price: [0.58, 0.575, 0.56, 0.57, 0.568, 0.562, 0.565]
    }
  },
  {
    id: "arbitrum",
    symbol: "arb",
    name: "Arbitrum",
    image: "https://assets.coingecko.com/coins/images/16547/large/photo_2023-03-29_21.47.00.jpeg",
    current_price: 0.985,
    market_cap_rank: 38,
    price_change_percentage_24h: 2.75,
    sparkline_in_7d: {
      price: [0.94, 0.96, 0.95, 0.97, 0.98, 0.975, 0.985]
    }
  },
  {
    id: "optimism",
    symbol: "op",
    name: "Optimism",
    image: "https://assets.coingecko.com/coins/images/25244/large/Optimism.png",
    current_price: 1.85,
    market_cap_rank: 45,
    price_change_percentage_24h: 3.12,
    sparkline_in_7d: {
      price: [1.75, 1.78, 1.80, 1.82, 1.87, 1.83, 1.85]
    }
  },
  {
    id: "base",
    symbol: "base",
    name: "Base Token",
    image: "https://assets.coingecko.com/coins/images/30748/large/base-logo.png",
    current_price: 1.00,
    market_cap_rank: 80,
    price_change_percentage_24h: 0.00,
    sparkline_in_7d: {
      price: [1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00]
    }
  },
  {
    id: "cardano",
    symbol: "ada",
    name: "Cardano",
    image: "https://assets.coingecko.com/coins/images/975/large/cardano.png",
    current_price: 0.385,
    market_cap_rank: 10,
    price_change_percentage_24h: 1.45,
    sparkline_in_7d: {
      price: [0.37, 0.375, 0.38, 0.378, 0.382, 0.381, 0.385]
    }
  },
  {
    id: "ripple",
    symbol: "xrp",
    name: "XRP",
    image: "https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png",
    current_price: 0.485,
    market_cap_rank: 7,
    price_change_percentage_24h: -0.85,
    sparkline_in_7d: {
      price: [0.49, 0.492, 0.48, 0.488, 0.486, 0.483, 0.485]
    }
  },
  {
    id: "polkadot",
    symbol: "dot",
    name: "Polkadot",
    image: "https://assets.coingecko.com/coins/images/12171/large/polkadot.png",
    current_price: 6.20,
    market_cap_rank: 15,
    price_change_percentage_24h: 2.15,
    sparkline_in_7d: {
      price: [5.95, 6.05, 6.00, 6.12, 6.18, 6.15, 6.20]
    }
  },
  {
    id: "avalanche-2",
    symbol: "avax",
    name: "Avalanche",
    image: "https://assets.coingecko.com/coins/images/4739/large/avalanche.png",
    current_price: 28.50,
    market_cap_rank: 12,
    price_change_percentage_24h: 3.42,
    sparkline_in_7d: {
      price: [27.20, 27.50, 27.00, 28.10, 28.40, 28.00, 28.50]
    }
  },
  {
    id: "chainlink",
    symbol: "link",
    name: "Chainlink",
    image: "https://assets.coingecko.com/coins/images/877/large/chainlink-link.png",
    current_price: 14.20,
    market_cap_rank: 14,
    price_change_percentage_24h: -1.15,
    sparkline_in_7d: {
      price: [14.50, 14.40, 14.00, 14.30, 14.25, 14.10, 14.20]
    }
  },
  {
    id: "uniswap",
    symbol: "uni",
    name: "Uniswap",
    image: "https://assets.coingecko.com/coins/images/12504/large/uniswap-uni.png",
    current_price: 7.80,
    market_cap_rank: 18,
    price_change_percentage_24h: 0.85,
    sparkline_in_7d: {
      price: [7.60, 7.75, 7.50, 7.85, 7.90, 7.70, 7.80]
    }
  },
  {
    id: "near",
    symbol: "near",
    name: "Near Protocol",
    image: "https://assets.coingecko.com/coins/images/10365/large/near.png",
    current_price: 4.90,
    market_cap_rank: 19,
    price_change_percentage_24h: 5.62,
    sparkline_in_7d: {
      price: [4.50, 4.70, 4.60, 4.80, 4.95, 4.85, 4.90]
    }
  },
  {
    id: "dogecoin",
    symbol: "doge",
    name: "Dogecoin",
    image: "https://assets.coingecko.com/coins/images/325/large/dogecoin.png",
    current_price: 0.115,
    market_cap_rank: 8,
    price_change_percentage_24h: -2.35,
    sparkline_in_7d: {
      price: [0.12, 0.118, 0.112, 0.116, 0.115, 0.114, 0.115]
    }
  },
  {
    id: "shiba-inu",
    symbol: "shib",
    name: "Shiba Inu",
    image: "https://assets.coingecko.com/coins/images/11939/large/shiba.png",
    current_price: 0.0000175,
    market_cap_rank: 11,
    price_change_percentage_24h: 1.12,
    sparkline_in_7d: {
      price: [0.000017, 0.0000172, 0.0000168, 0.0000174, 0.0000176, 0.0000173, 0.0000175]
    }
  },
  {
    id: "pepe",
    symbol: "pepe",
    name: "Pepe",
    image: "https://assets.coingecko.com/coins/images/29850/large/pepe-token.png",
    current_price: 0.0000095,
    market_cap_rank: 22,
    price_change_percentage_24h: 8.45,
    sparkline_in_7d: {
      price: [0.0000085, 0.0000088, 0.0000082, 0.0000092, 0.0000096, 0.0000091, 0.0000095]
    }
  },
  {
    id: "fantom",
    symbol: "ftm",
    name: "Fantom",
    image: "https://assets.coingecko.com/coins/images/4001/large/Fantom.png",
    current_price: 0.55,
    market_cap_rank: 50,
    price_change_percentage_24h: -0.45,
    sparkline_in_7d: {
      price: [0.56, 0.558, 0.54, 0.552, 0.551, 0.548, 0.55]
    }
  },
  {
    id: "render-token",
    symbol: "render",
    name: "Render Token",
    image: "https://assets.coingecko.com/coins/images/11636/large/render.png",
    current_price: 7.25,
    market_cap_rank: 30,
    price_change_percentage_24h: 2.15,
    sparkline_in_7d: {
      price: [7.00, 7.15, 6.90, 7.30, 7.35, 7.18, 7.25]
    }
  },
  {
    id: "sui",
    symbol: "sui",
    name: "Sui",
    image: "https://assets.coingecko.com/coins/images/26375/large/sui_logo.png",
    current_price: 1.15,
    market_cap_rank: 28,
    price_change_percentage_24h: 4.85,
    sparkline_in_7d: {
      price: [1.08, 1.12, 1.10, 1.16, 1.18, 1.13, 1.15]
    }
  },
  {
    id: "aptos",
    symbol: "apt",
    name: "Aptos",
    image: "https://assets.coingecko.com/coins/images/26455/large/aptos_logo.png",
    current_price: 6.80,
    market_cap_rank: 27,
    price_change_percentage_24h: -1.25,
    sparkline_in_7d: {
      price: [6.95, 6.90, 6.70, 6.85, 6.82, 6.75, 6.80]
    }
  },
  {
    id: "stellar",
    symbol: "xlm",
    name: "Stellar",
    image: "https://assets.coingecko.com/coins/images/100/large/Stellar_symbol_black_RGB.png",
    current_price: 0.095,
    market_cap_rank: 24,
    price_change_percentage_24h: 0.25,
    sparkline_in_7d: {
      price: [0.094, 0.095, 0.093, 0.096, 0.095, 0.094, 0.095]
    }
  },
  {
    id: "cosmos",
    symbol: "atom",
    name: "Cosmos",
    image: "https://assets.coingecko.com/coins/images/825/large/cosmos-atom-logo.png",
    current_price: 6.15,
    market_cap_rank: 29,
    price_change_percentage_24h: 1.84,
    sparkline_in_7d: {
      price: [6.00, 6.10, 5.95, 6.20, 6.18, 6.10, 6.15]
    }
  },
  {
    id: "litecoin",
    symbol: "ltc",
    name: "Litecoin",
    image: "https://assets.coingecko.com/coins/images/2/large/litecoin.png",
    current_price: 74.50,
    market_cap_rank: 20,
    price_change_percentage_24h: -0.92,
    sparkline_in_7d: {
      price: [75.80, 75.10, 73.50, 74.90, 74.80, 74.10, 74.50]
    }
  },
  {
    id: "tron",
    symbol: "trx",
    name: "TRON",
    image: "https://assets.coingecko.com/coins/images/1094/large/tron.png",
    current_price: 0.125,
    market_cap_rank: 9,
    price_change_percentage_24h: 0.45,
    sparkline_in_7d: {
      price: [0.124, 0.125, 0.123, 0.126, 0.125, 0.124, 0.125]
    }
  }
];

/**
 * Fetches real-time price metrics from CoinGecko API.
 * Gracefully falls back to high-fidelity simulated feeds if rate-limited (HTTP 429).
 */
async function fetchPrices() {
  const loadingDiv = document.getElementById('prices-loading');
  const errorDiv = document.getElementById('prices-error');
  const gridDiv = document.getElementById('prices-grid');
  const listContainer = document.getElementById('prices-list-container');
  const updatedText = document.getElementById('last-updated-text');
  const rateLimitBanner = document.getElementById('prices-rate-limit-banner');

  loadingDiv.style.display = 'flex';
  errorDiv.style.display = 'none';
  gridDiv.style.display = 'none';
  if (listContainer) listContainer.style.display = 'none';
  if (rateLimitBanner) {
    rateLimitBanner.style.display = 'none';
  }

  // Fetch prices for Bitcoin, Ethereum, Solana, Polygon, Arbitrum, Optimism, Base, Cardano, Ripple, Polkadot, Avalanche, Chainlink, Uniswap, Near, Dogecoin, Shiba Inu, Pepe, Fantom, Render, Sui, Aptos, Stellar, Cosmos, Litecoin, and TRON
  const url = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana,polygon-ecosystem-token,arbitrum,optimism,base,cardano,ripple,polkadot,avalanche-2,chainlink,uniswap,near,dogecoin,shiba-inu,pepe,fantom,render-token,sui,aptos,stellar,cosmos,litecoin,tron&order=market_cap_desc&sparkline=true&price_change_percentage=24h';

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }
    const data = await response.json();
    coinCache = data;
    
    // Render prices grid
    renderPriceCards(data);
    
    // Set updated timestamp
    const now = new Date();
    updatedText.textContent = `Refreshed at: ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
    
    loadingDiv.style.display = 'none';
    gridDiv.style.display = 'grid';
    if (listContainer) listContainer.style.display = 'block';
  } catch (error) {
    console.error('Failed to fetch from CoinGecko, launching rate-limit fallback mode:', error);
    
    // Use fallback coins cache
    coinCache = fallbackCoins;
    renderPriceCards(fallbackCoins);

    // Show warning banner
    if (rateLimitBanner) {
      rateLimitBanner.style.display = 'flex';
    }
    
    const now = new Date();
    updatedText.textContent = `Demo Feed (Fallback): ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;

    loadingDiv.style.display = 'none';
    gridDiv.style.display = 'grid';
    if (listContainer) listContainer.style.display = 'block';
  }
}

/**
 * Dynamic HTML rendering of Coin price cards and list rows.
 * @param {Array} coins - List of coin market objects.
 */
function renderPriceCards(coins) {
  const gridDiv = document.getElementById('prices-grid');
  const listDiv = document.getElementById('prices-list');
  const listContainer = document.getElementById('prices-list-container');

  gridDiv.innerHTML = '';
  if (listDiv) listDiv.innerHTML = '';

  if (!Array.isArray(coins) || coins.length === 0) {
    gridDiv.innerHTML = `<div class="loading-indicator" style="grid-column: 1 / -1;"><p>No matching tokens found.</p></div>`;
    if (listContainer) listContainer.style.display = 'none';
    return;
  }

  // Display top 5 as cards, and rest as list rows
  const cardCoins = coins.slice(0, 5);
  const listCoins = coins.slice(5);

  if (listContainer) {
    listContainer.style.display = listCoins.length > 0 ? 'block' : 'none';
  }

  cardCoins.forEach(coin => {
    if (!coin) return;

    const name = coin.name || 'Unknown Coin';
    const symbol = (coin.symbol || 'N/A').toUpperCase();
    const rank = coin.market_cap_rank != null ? `Rank #${coin.market_cap_rank}` : 'Rank N/A';
    const image = coin.image || '';

    // Formatted current price
    const rawPrice = coin.current_price;
    const priceDisplay = rawPrice != null 
      ? `$${rawPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}` 
      : 'Price N/A';

    // Formatted price change
    const changePercent = coin.price_change_percentage_24h_in_currency != null 
      ? coin.price_change_percentage_24h_in_currency 
      : (coin.price_change_percentage_24h != null ? coin.price_change_percentage_24h : null);

    const isUp = changePercent != null ? changePercent >= 0 : true;
    const priceChangeText = changePercent != null ? `${isUp ? '+' : ''}${changePercent.toFixed(2)}%` : '0.00%';

    // Generate normalized SVG trend path
    const sparklineData = coin.sparkline_in_7d?.price || [];
    const sparklinePath = generateSparklinePath(sparklineData, 260, 45);

    const priceCard = document.createElement('div');
    priceCard.className = 'price-card';
    priceCard.innerHTML = `
      <div class="price-card-header">
        <div class="coin-info">
          <div class="coin-icon">
            ${image ? `<img src="${image}" alt="${name} logo" width="24" height="24">` : '🪙'}
          </div>
          <div>
            <div class="coin-name">${name}</div>
            <div class="coin-symbol">${symbol} <span class="coin-rank">${rank}</span></div>
          </div>
        </div>
      </div>
      <div class="coin-price">${priceDisplay}</div>
      <div class="price-change-row ${changePercent != null ? (isUp ? 'change-up' : 'change-down') : 'change-up'}" style="opacity: ${changePercent != null ? 1 : 0.5};">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align: middle;">
          ${isUp 
            ? '<polyline points="18 15 12 9 6 15"/>' 
            : '<polyline points="6 9 12 15 18 9"/>'}
        </svg>
        <span>${priceChangeText} (24h)</span>
      </div>
      <div class="sparkline-container">
        ${sparklinePath ? `
          <svg class="sparkline-svg" viewBox="0 0 260 45">
            <path d="${sparklinePath}" fill="none" stroke="${isUp ? 'var(--color-success)' : 'var(--color-danger)'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        ` : `<div style="font-size: 0.75rem; color: var(--color-text-muted); text-align: center; line-height: 45px;">No trend data</div>`}
      </div>
    `;
    gridDiv.appendChild(priceCard);
  });

  if (listDiv) {
    listCoins.forEach(coin => {
      if (!coin) return;

      const name = coin.name || 'Unknown Coin';
      const symbol = (coin.symbol || 'N/A').toUpperCase();
      const rank = coin.market_cap_rank != null ? `Rank #${coin.market_cap_rank}` : 'Rank N/A';
      const image = coin.image || '';

      const rawPrice = coin.current_price;
      const priceDisplay = rawPrice != null 
        ? `$${rawPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}` 
        : 'Price N/A';

      const changePercent = coin.price_change_percentage_24h_in_currency != null 
        ? coin.price_change_percentage_24h_in_currency 
        : (coin.price_change_percentage_24h != null ? coin.price_change_percentage_24h : null);

      const isUp = changePercent != null ? changePercent >= 0 : true;
      const priceChangeText = changePercent != null ? `${isUp ? '+' : ''}${changePercent.toFixed(2)}%` : '0.00%';

      const listRow = document.createElement('div');
      listRow.className = 'price-list-row';
      listRow.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
          <div class="coin-icon" style="width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
            ${image ? `<img src="${image}" alt="${name} logo" width="24" height="24">` : '🪙'}
          </div>
          <div>
            <span style="font-weight: 700; color: var(--color-text-primary); font-family: var(--font-orbitron);">${name}</span>
            <span style="font-size: 0.8rem; color: var(--color-text-muted); margin-left: 8px;">${symbol} &bull; ${rank}</span>
          </div>
        </div>
        <div style="font-family: var(--font-mono); font-weight: 700; color: var(--color-text-primary); text-align: right; width: 140px;">
          ${priceDisplay}
        </div>
        <div class="${isUp ? 'change-up' : 'change-down'}" style="text-align: right; width: 100px; font-weight: 700; display: flex; align-items: center; justify-content: flex-end; gap: 4px;">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            ${isUp ? '<polyline points="18 15 12 9 6 15"/>' : '<polyline points="6 9 12 15 18 9"/>'}
          </svg>
          <span>${priceChangeText}</span>
        </div>
      `;
      listDiv.appendChild(listRow);
    });
  }
}

/**
 * Converts raw price history arrays to normalized SVG path coordinates.
 */
function generateSparklinePath(data, width, height) {
  if (data.length < 2) return '';
  
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min === 0 ? 1 : max - min;
  
  const points = data.map((price, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - 4 - ((price - min) / range) * (height - 8);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  
  return `M ${points.join(' L ')}`;
}

// Bind Search & Refresh inputs
document.addEventListener('DOMContentLoaded', () => {
  const refreshBtn = document.getElementById('refresh-prices-btn');
  const retryBtn = document.getElementById('error-retry-btn');
  const searchInput = document.getElementById('coin-search');

  if (refreshBtn) {
    refreshBtn.addEventListener('click', fetchPrices);
  }
  if (retryBtn) {
    retryBtn.addEventListener('click', fetchPrices);
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      if (!query) {
        renderPriceCards(coinCache);
        return;
      }
      const filtered = coinCache.filter(coin => 
        coin.name.toLowerCase().includes(query) || 
        coin.symbol.toLowerCase().includes(query)
      );
      renderPriceCards(filtered);
    });
  }
});


// ----------------------------------------------------
// DYNAMIC BLOCKCHAIN SIMULATOR LOGIC (WITH WEB WORKER)
// ----------------------------------------------------

let blockchain = [];
let difficulty = 2; // Default: leading '00'
let isMiningMap = {}; // Tracks mining activity state per block
let activeMiningWorker = null; // Background mining worker instance

/**
 * Serializes block transaction objects into a consistent text block string.
 * @param {Array} txs - List of transactions in the block.
 * @returns {string}
 */
function serializeTransactions(txs) {
  if (!txs || txs.length === 0) return "No transactions (empty block)";
  return txs.map(tx => `${tx.from.trim()}➔${tx.to.trim()}➔${tx.amount}${tx.symbol || 'ETH'}`).join('|');
}

/**
 * Sequential hash recalculation starting from Block 1.
 * Ensures changes cascade to all subsequent blocks.
 */
async function recalculateAllHashes() {
  for (let i = 0; i < blockchain.length; i++) {
    const block = blockchain[i];
    
    // Wire up previous hash linking
    if (i > 0) {
      block.prevHash = blockchain[i - 1].hash;
    } else {
      block.prevHash = "0000000000000000000000000000000000000000000000000000000000000000";
    }

    const text = block.index.toString() + block.prevHash + block.nonce.toString() + (block.data || '');
    block.hash = await sha256(text);
  }
}

/**
 * Updates the block data string directly from user input.
 */
async function updateBlockData(blockIndex, value) {
  const block = blockchain.find(b => b.index === blockIndex);
  if (block) {
    block.data = value;
    await recalculateAllHashes();
    renderBlockchain();
  }
}

/**
 * Updates the block state nonce when user directly alters the nonce input field.
 */
async function updateBlockNonce(blockIndex, value) {
  const block = blockchain.find(b => b.index === blockIndex);
  if (block) {
    block.nonce = parseInt(value) || 0;
    await recalculateAllHashes();
    renderBlockchain();
  }
}

/**
 * Appends a new mock transaction to a block card's ledger.
 */
async function addTransaction(blockIndex) {
  const fromInput = document.getElementById(`tx-from-${blockIndex}`);
  const toInput = document.getElementById(`tx-to-${blockIndex}`);
  const amountInput = document.getElementById(`tx-amount-${blockIndex}`);

  if (!fromInput || !toInput || !amountInput) return;

  const from = fromInput.value.trim();
  const to = toInput.value.trim();
  const amount = parseFloat(amountInput.value);

  if (!from || !to || isNaN(amount) || amount <= 0) {
    alert("Please enter a valid Sender, Recipient, and positive Amount.");
    return;
  }

  const block = blockchain.find(b => b.index === blockIndex);
  if (block) {
    block.transactions.push({ from, to, amount, symbol: 'ETH' });
    
    // Sync text area value
    block.data = serializeTransactions(block.transactions);

    // Clear inputs
    fromInput.value = '';
    toInput.value = '';
    amountInput.value = '';

    await recalculateAllHashes();
    renderBlockchain();
  }
}

/**
 * Removes a specific transaction from a block's ledger.
 */
async function deleteTransaction(blockIndex, txIdx) {
  const block = blockchain.find(b => b.index === blockIndex);
  if (block && block.transactions[txIdx]) {
    block.transactions.splice(txIdx, 1);
    
    // Sync text area value
    block.data = serializeTransactions(block.transactions);

    await recalculateAllHashes();
    renderBlockchain();
  }
}

/**
 * Adds a new block to the end of the chain.
 */
async function addBlock() {
  const newIndex = blockchain.length + 1;
  const prevHash = blockchain.length > 0 ? blockchain[blockchain.length - 1].hash : "0000000000000000000000000000000000000000000000000000000000000000";

  const defaultTxs = [
    { from: "Alice", to: "Bob", amount: 1.5, symbol: 'ETH' }
  ];

  blockchain.push({
    index: newIndex,
    nonce: 0,
    prevHash: prevHash,
    transactions: defaultTxs,
    data: serializeTransactions(defaultTxs),
    hash: ""
  });

  await recalculateAllHashes();
  renderBlockchain();
}

/**
 * Offloads block mining to a background Web Worker to keep the main thread fully responsive.
 */
function mineBlock(blockIndex) {
  const block = blockchain.find(b => b.index === blockIndex);
  if (!block) return;

  // Terminate any active mining worker first to prevent collision
  if (activeMiningWorker) {
    activeMiningWorker.terminate();
    activeMiningWorker = null;
  }

  isMiningMap[blockIndex] = true;
  renderBlockchain(); // Redraw immediately to show mining state (spinner)

  // Reveal progress bar container on mined card
  const progressContainer = document.getElementById(`mining-progress-${blockIndex}`);
  const progressFill = document.getElementById(`mining-progress-fill-${blockIndex}`);
  const nonceCountDisplay = document.getElementById(`mining-nonce-count-${blockIndex}`);
  
  if (progressContainer) {
    progressContainer.style.display = 'block';
  }

  disableBlockchainInteractions(true);

  // Stringified worker code (uses Crypto subtle API inside thread)
  const workerCode = `
    async function sha256(text) {
      const encoder = new TextEncoder();
      const data = encoder.encode(text);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    self.onmessage = async function(e) {
      const { index, prevHash, data, difficulty } = e.data;
      const diffPrefix = '0'.repeat(difficulty);
      let currentNonce = 0;

      while (true) {
        const text = index.toString() + prevHash + currentNonce.toString() + (data || '');
        const hash = await sha256(text);

        if (hash.startsWith(diffPrefix)) {
          self.postMessage({ type: 'success', nonce: currentNonce, hash: hash });
          break;
        }

        currentNonce++;
        // Periodically notify main thread of search space progress
        if (currentNonce % 2500 === 0) {
          self.postMessage({ type: 'progress', nonce: currentNonce });
        }
      }
    };
  `;

  const blob = new Blob([workerCode], { type: 'application/javascript' });
  const workerUrl = URL.createObjectURL(blob);
  activeMiningWorker = new Worker(workerUrl);

  activeMiningWorker.postMessage({
    index: block.index,
    prevHash: block.prevHash,
    data: block.data,
    difficulty: difficulty
  });

  activeMiningWorker.onmessage = async function(e) {
    const msg = e.data;
    if (msg.type === 'progress') {
      if (nonceCountDisplay) {
        nonceCountDisplay.textContent = msg.nonce.toLocaleString();
      }
      if (progressFill) {
        // Approximate visual load based on difficulty probability
        const scaleVal = Math.pow(16, difficulty);
        const progressPct = Math.min((msg.nonce / (scaleVal / 1.5)) * 100, 98);
        progressFill.style.width = `${progressPct}%`;
      }
    } else if (msg.type === 'success') {
      block.nonce = msg.nonce;
      block.hash = msg.hash;
      isMiningMap[blockIndex] = false;
      disableBlockchainInteractions(false);

      activeMiningWorker.terminate();
      activeMiningWorker = null;

      await recalculateAllHashes();
      renderBlockchain();

      // Trigger visual success pulse on the mined block card
      const minedCard = document.getElementById(`block-${blockIndex}-card`);
      if (minedCard) {
        minedCard.classList.add('mine-success-glow');
        setTimeout(() => {
          minedCard.classList.remove('mine-success-glow');
        }, 1000);
      }
    }
  };
}

/**
 * Toggles disabled states on input controls during mining loops to prevent data-races.
 */
function disableBlockchainInteractions(isDisabled) {
  const container = document.getElementById('blockchain-container');
  if (!container) return;

  container.querySelectorAll('input, button, textarea').forEach(el => {
    el.disabled = isDisabled;
  });

  const addBlockBtn = document.getElementById('add-block-btn');
  const resetBtn = document.getElementById('reset-simulator-btn');
  const diffSlider = document.getElementById('difficulty-slider');

  if (addBlockBtn) addBlockBtn.disabled = isDisabled;
  if (resetBtn) resetBtn.disabled = isDisabled;
  if (diffSlider) diffSlider.disabled = isDisabled;
}

/**
 * Fully resets/reinitializes the blockchain simulator with custom genesis blocks.
 */
async function resetChain() {
  const genesisTxs = [
    { from: "Genesis", to: "Satoshi", amount: 50.0, symbol: 'ETH' }
  ];
  const block2Txs = [
    { from: "Satoshi", to: "Hal Finney", amount: 10.0, symbol: 'ETH' },
    { from: "Satoshi", to: "Alice", amount: 5.0, symbol: 'ETH' }
  ];

  blockchain = [
    {
      index: 1,
      nonce: 167, // pre-mined valid nonce for diff 2 ('00')
      prevHash: "0000000000000000000000000000000000000000000000000000000000000000",
      transactions: genesisTxs,
      data: serializeTransactions(genesisTxs),
      hash: ""
    },
    {
      index: 2,
      nonce: 312, // pre-mined valid nonce for diff 2 ('00')
      prevHash: "",
      transactions: block2Txs,
      data: serializeTransactions(block2Txs),
      hash: ""
    }
  ];

  await recalculateAllHashes();
  renderBlockchain();
}

/**
 * Dynamically builds and draws the blockchain cards, transaction ledgers, and connector vectors.
 */
function renderBlockchain() {
  const container = document.getElementById('blockchain-container');
  if (!container) return;

  container.innerHTML = '';
  const diffPrefix = '0'.repeat(difficulty);

  blockchain.forEach((block, idx) => {
    const startsWithZeros = block.hash.startsWith(diffPrefix);
    let isPrevHashValid = true;
    if (idx > 0) {
      isPrevHashValid = block.prevHash === blockchain[idx - 1].hash && blockchain[idx - 1].hash.startsWith(diffPrefix);
    }
    const isValid = startsWithZeros && isPrevHashValid;

    // Build ledger list HTML
    let txsHtml = '';
    if (block.transactions && block.transactions.length > 0) {
      block.transactions.forEach((tx, txIdx) => {
        const sym = tx.symbol || 'ETH';
        txsHtml += `
          <li class="ledger-tx-item">
            <span class="ledger-tx-text"><strong>${tx.from}</strong> ➔ <strong>${tx.to}</strong>: ${tx.amount} ${sym}</span>
            <button class="ledger-tx-delete" onclick="deleteTransaction(${block.index}, ${txIdx})" title="Delete Transaction">×</button>
          </li>
        `;
      });
    } else {
      txsHtml = `<li style="font-size: 0.75rem; color: var(--color-text-muted); text-align: center; padding: 6px; list-style: none;">No transactions (Empty Block)</li>`;
    }

    const blockCard = document.createElement('div');
    blockCard.className = `glass-panel sim-block ${isValid ? 'valid' : 'invalid'}`;
    blockCard.id = `block-${block.index}-card`;

    blockCard.innerHTML = `
      <div class="block-meta">
        <span class="block-num">BLOCK #${block.index}</span>
        <span class="block-status-badge ${isValid ? 'status-valid' : 'status-invalid'}">
          ${isValid ? '● VALID' : '● INVALID'}
        </span>
      </div>

      <div class="sim-form-group">
        <label class="sim-label" for="block-${block.index}-data">Block Data (text)</label>
        <textarea class="sim-input sim-input-mono" id="block-${block.index}-data" rows="3" placeholder="Enter block data..." oninput="updateBlockData(${block.index}, this.value)">${block.data || ''}</textarea>
      </div>

      <div class="sim-form-group">
        <label class="sim-label">Transaction Ledger Helper</label>
        <div class="ledger-container">
          <ul class="ledger-tx-list">
            ${txsHtml}
          </ul>
          
          <div class="ledger-form">
            <input type="text" placeholder="From" class="ledger-input" id="tx-from-${block.index}">
            <input type="text" placeholder="To" class="ledger-input" id="tx-to-${block.index}">
            <input type="number" step="0.01" placeholder="ETH" class="ledger-input" id="tx-amount-${block.index}">
            <button class="btn-add-tx" onclick="addTransaction(${block.index})" title="Add Transaction">+</button>
          </div>
        </div>
      </div>

      <div class="sim-form-group">
        <label class="sim-label" for="block-${block.index}-nonce">Nonce</label>
        <input type="number" class="sim-input sim-input-mono" id="block-${block.index}-nonce" value="${block.nonce}" oninput="updateBlockNonce(${block.index}, this.value)">
      </div>

      <!-- Live Web Worker Hashing Progress Indicator -->
      <div class="mining-progress-container" id="mining-progress-${block.index}" style="display: none; margin-top: 12px; margin-bottom: 12px;">
        <div class="progress-bar-label">
          <span>Mining hashes...</span>
          <span>Checked Nonce: <strong id="mining-nonce-count-${block.index}">0</strong></span>
        </div>
        <div class="progress-bar-track">
          <div class="progress-bar-fill" id="mining-progress-fill-${block.index}"></div>
        </div>
      </div>

      <div class="sim-form-group">
        <span class="sim-label">Previous Hash</span>
        <div class="hash-display-box">
          <span class="hash-label-inside">PREV</span>
          <span class="hash-value" style="color: ${idx === 0 ? 'var(--color-text-muted)' : ''};">${block.prevHash}</span>
        </div>
      </div>

      <div class="sim-form-group">
        <span class="sim-label">Block Hash</span>
        <div class="hash-display-box">
          <span class="hash-label-inside">HASH</span>
          <span class="hash-value">${block.hash}</span>
        </div>
      </div>

      <div class="sim-actions">
        <button class="btn btn-primary" id="mine-btn-${block.index}" onclick="mineBlock(${block.index})" ${isMiningMap[block.index] ? 'disabled' : ''}>
          ${isMiningMap[block.index] ? '<span class="spinner" style="width: 14px; height: 14px; display: inline-block; border-width: 2px; margin-right: 6px; vertical-align: middle;"></span> Mining...' : `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px; vertical-align: middle; display: inline-block;">
              <path d="M21.73 18l-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3z"/>
            </svg> Mine Block #${block.index}
          `}
        </button>
      </div>
    `;

    container.appendChild(blockCard);

    // If not the final block in the chain, append the link connector
    if (idx < blockchain.length - 1) {
      const nextBlock = blockchain[idx + 1];
      const isNextLinkValid = nextBlock.prevHash === block.hash && block.hash.startsWith(diffPrefix) && isValid;

      const connector = document.createElement('div');
      connector.className = `block-connector ${isNextLinkValid ? 'valid' : 'invalid'}`;
      connector.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      `;
      container.appendChild(connector);
    }
  });
}

/**
 * Initializes the simulator. Called whenever routing navigates to #/simulator.
 */
function initSimulator() {
  if (blockchain.length === 0) {
    resetChain();
  } else {
    recalculateAllHashes().then(() => {
      renderBlockchain();
    });
  }
}

// Bind page components and controls
document.addEventListener('DOMContentLoaded', () => {
  // Initialize comparison card hovers
  initComparisonRowHovers();

  // Initialize concept card tabs, quiz & simulator
  initConceptTabs();
  initConceptsQuiz();
  initKeypairSimulator();

  // Difficulty Slider binding
  const diffSlider = document.getElementById('difficulty-slider');
  const diffVal = document.getElementById('difficulty-val');
  if (diffSlider) {
    diffSlider.addEventListener('input', async (e) => {
      difficulty = parseInt(e.target.value) || 2;
      let label = `${difficulty} Zero`;
      if (difficulty > 1) label += 's';
      
      if (difficulty === 1) label += ' (Very Easy)';
      else if (difficulty === 2) label += ' (Easy)';
      else if (difficulty === 3) label += ' (Medium)';
      else if (difficulty === 4) label += ' (Hard)';
      else if (difficulty === 5) label += ' (Expert)';

      if (diffVal) diffVal.textContent = label;

      await recalculateAllHashes();
      renderBlockchain();
    });
  }

  // Add Block button
  const addBtn = document.getElementById('add-block-btn');
  if (addBtn) {
    addBtn.addEventListener('click', addBlock);
  }

  // Reset Chain button
  const resetBtn = document.getElementById('reset-simulator-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', resetChain);
  }
});


// ----------------------------------------------------
// WALLET MANAGEMENT LOGIC
// ----------------------------------------------------

function initWalletListeners() {
  const connectBtn = document.getElementById('connect-wallet-btn');
  const disconnectBtn = document.getElementById('disconnect-wallet-btn');
  const dropdown = document.getElementById('wallet-dropdown');
  const networkSelect = document.getElementById('wallet-network-select');
  const faucetBtn = document.getElementById('faucet-btn');

  if (connectBtn) {
    connectBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!walletState.connected) {
        // Connect Wallet
        walletState.connected = true;
        // Generate mock address
        const arr = new Uint8Array(20);
        crypto.getRandomValues(arr);
        walletState.address = '0x' + Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
        // Initialize mock NXT balances
        walletState.nxtBalances[walletState.address] = 0.00;
        syncWalletUI();
        if (dropdown) dropdown.style.display = 'block';
      } else {
        // Toggle dropdown display
        if (dropdown) {
          dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
        }
      }
    });
  }

  // Prevent dropdown closing when clicking inside it
  if (dropdown) {
    dropdown.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  // Close dropdown when clicking outside
  document.addEventListener('click', () => {
    if (dropdown) dropdown.style.display = 'none';
  });

  if (disconnectBtn) {
    disconnectBtn.addEventListener('click', () => {
      walletState.connected = false;
      walletState.address = '';
      syncWalletUI();
      if (dropdown) dropdown.style.display = 'none';
    });
  }

  if (networkSelect) {
    networkSelect.addEventListener('change', (e) => {
      walletState.network = e.target.value;
      syncWalletUI();
      
      // Update displays if on active view
      const activeHash = window.location.hash || '#/';
      if (activeHash === '#/bridge') {
        initBridgePage();
      }
    });
  }

  if (faucetBtn) {
    faucetBtn.addEventListener('click', async () => {
      if (!walletState.connected) return;
      
      walletState.balances.arbitrum.ETH += 0.1;
      walletState.balances.arbitrum.USDC += 100.00;
      syncWalletUI();

      // Log Faucet transaction to Blockchain Simulator
      const newIndex = blockchain.length + 1;
      const prevHash = blockchain.length > 0 ? blockchain[blockchain.length - 1].hash : "0000000000000000000000000000000000000000000000000000000000000000";
      const txs = [
        { from: "Faucet Escrow", to: walletState.address, amount: 0.1, symbol: 'ETH' },
        { from: "Faucet Escrow", to: walletState.address, amount: 100.00, symbol: 'USDC' }
      ];

      blockchain.push({
        index: newIndex,
        nonce: 0,
        prevHash: prevHash,
        transactions: txs,
        data: serializeTransactions(txs),
        hash: ""
      });

      await recalculateAllHashes();
      renderBlockchain();
      
      alert("L2 Faucet Claimed! 0.1 ETH and 100 USDC added to your Arbitrum L2 Wallet. A new transaction block was logged to the simulator.");
    });
  }
}

function syncWalletUI() {
  const connectBtn = document.getElementById('connect-wallet-btn');
  const dropdown = document.getElementById('wallet-dropdown');
  const addressText = document.getElementById('wallet-address');
  const netSelect = document.getElementById('wallet-network-select');
  
  const balEthL1 = document.getElementById('wallet-balance-l1');
  const balEthL2 = document.getElementById('wallet-balance-l2');
  const balUsdcL1 = document.getElementById('wallet-usdc-l1');
  const balUsdcL2 = document.getElementById('wallet-usdc-l2');

  const bridgeBalSrc = document.getElementById('bridge-balance-src');
  const bridgeBalDst = document.getElementById('bridge-balance-dst');

  if (walletState.connected) {
    if (connectBtn) {
      connectBtn.textContent = `${walletState.address.slice(0, 6)}...${walletState.address.slice(-4)}`;
      connectBtn.classList.remove('btn-primary');
      connectBtn.classList.add('btn-secondary');
    }
    
    if (addressText) addressText.textContent = `${walletState.address.slice(0, 8)}...${walletState.address.slice(-8)}`;
    if (netSelect) netSelect.value = walletState.network;
    
    if (balEthL1) balEthL1.textContent = `${walletState.balances.ethereum.ETH.toFixed(2)} ETH`;
    if (balEthL2) balEthL2.textContent = `${walletState.balances.arbitrum.ETH.toFixed(2)} ETH`;
    if (balUsdcL1) balUsdcL1.textContent = `${walletState.balances.ethereum.USDC.toFixed(2)} USDC`;
    if (balUsdcL2) balUsdcL2.textContent = `${walletState.balances.arbitrum.USDC.toFixed(2)} USDC`;

    const bridgeAsset = document.getElementById('bridge-asset-select')?.value || 'ETH';
    if (bridgeMode === 'deposit') {
      if (bridgeBalSrc) {
        bridgeBalSrc.textContent = bridgeAsset === 'ETH'
          ? `${walletState.balances.ethereum.ETH.toFixed(2)} ETH` 
          : `${walletState.balances.ethereum.USDC.toFixed(2)} USDC`;
      }
      if (bridgeBalDst) {
        bridgeBalDst.textContent = bridgeAsset === 'ETH'
          ? `${walletState.balances.arbitrum.ETH.toFixed(2)} ETH` 
          : `${walletState.balances.arbitrum.USDC.toFixed(2)} USDC`;
      }
    } else {
      if (bridgeBalSrc) {
        bridgeBalSrc.textContent = bridgeAsset === 'ETH'
          ? `${walletState.balances.arbitrum.ETH.toFixed(2)} ETH` 
          : `${walletState.balances.arbitrum.USDC.toFixed(2)} USDC`;
      }
      if (bridgeBalDst) {
        bridgeBalDst.textContent = bridgeAsset === 'ETH'
          ? `${walletState.balances.ethereum.ETH.toFixed(2)} ETH` 
          : `${walletState.balances.ethereum.USDC.toFixed(2)} USDC`;
      }
    }
  } else {
    if (connectBtn) {
      connectBtn.textContent = 'Connect Wallet';
      connectBtn.classList.add('btn-primary');
      connectBtn.classList.remove('btn-secondary');
    }
    if (dropdown) dropdown.style.display = 'none';
    
    if (balEthL1) balEthL1.textContent = '10.00 ETH';
    if (balEthL2) balEthL2.textContent = '0.50 ETH';
    if (balUsdcL1) balUsdcL1.textContent = '1000.00 USDC';
    if (balUsdcL2) balUsdcL2.textContent = '0.00 USDC';

    if (bridgeBalSrc) bridgeBalSrc.textContent = '10.00 ETH';
    if (bridgeBalDst) bridgeBalDst.textContent = '0.50 ETH';
  }
}


// ----------------------------------------------------
// ARBITRUM L2 TOKEN BRIDGE LOGIC
// ----------------------------------------------------

function initBridgePage() {
  syncWalletUI();
  
  const assetSelect = document.getElementById('bridge-asset-select');
  const amountInput = document.getElementById('bridge-amount');
  const maxBtn = document.getElementById('bridge-btn-max');
  const initiateBtn = document.getElementById('initiate-bridge-btn');
  const closeConsoleBtn = document.getElementById('close-bridge-console-btn');

  const depositTab = document.getElementById('bridge-deposit-tab');
  const withdrawTab = document.getElementById('bridge-withdraw-tab');

  if (depositTab && withdrawTab) {
    depositTab.onclick = () => {
      bridgeMode = 'deposit';
      depositTab.classList.add('active');
      withdrawTab.classList.remove('active');
      updateBridgeUI();
    };
    withdrawTab.onclick = () => {
      bridgeMode = 'withdraw';
      withdrawTab.classList.add('active');
      depositTab.classList.remove('active');
      updateBridgeUI();
    };
  }

  if (assetSelect) {
    assetSelect.addEventListener('change', () => {
      syncWalletUI();
      if (amountInput) amountInput.value = '';
    });
  }

  if (maxBtn && amountInput) {
    maxBtn.onclick = () => {
      if (!walletState.connected) {
        alert("Please connect your mock wallet first.");
        return;
      }
      const asset = assetSelect.value;
      if (bridgeMode === 'deposit') {
        if (asset === 'ETH') {
          amountInput.value = Math.max(0, walletState.balances.ethereum.ETH - 0.005).toFixed(4);
        } else {
          amountInput.value = walletState.balances.ethereum.USDC.toFixed(2);
        }
      } else {
        if (asset === 'ETH') {
          amountInput.value = Math.max(0, walletState.balances.arbitrum.ETH - 0.0001).toFixed(4);
        } else {
          amountInput.value = walletState.balances.arbitrum.USDC.toFixed(2);
        }
      }
    };
  }

  if (initiateBtn) {
    // Rebind to avoid duplication
    initiateBtn.onclick = () => runBridgeSequence();
  }

  if (closeConsoleBtn) {
    closeConsoleBtn.onclick = () => {
      const consoleCard = document.getElementById('bridge-status-card');
      if (consoleCard) consoleCard.style.display = 'none';
    };
  }
}

function updateBridgeUI() {
  const srcName = document.getElementById('bridge-network-src-name');
  const dstName = document.getElementById('bridge-network-dst-name');
  const srcIcon = document.getElementById('bridge-network-src-icon');
  const dstIcon = document.getElementById('bridge-network-dst-icon');
  const gasLabel = document.getElementById('bridge-gas-label');
  const gasValue = document.getElementById('bridge-gas-value');
  const timeValue = document.getElementById('bridge-time-value');
  const btn = document.getElementById('initiate-bridge-btn');
  const directionArrow = document.getElementById('bridge-direction-arrow');

  const ethIconHTML = 'Ξ';
  const arbIconHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  `;

  if (bridgeMode === 'deposit') {
    if (srcName) srcName.textContent = 'Ethereum Mainnet (L1)';
    if (dstName) dstName.textContent = 'Arbitrum L2';
    if (srcIcon) { srcIcon.innerHTML = ethIconHTML; srcIcon.className = 'network-icon eth-icon'; }
    if (dstIcon) { dstIcon.innerHTML = arbIconHTML; dstIcon.className = 'network-icon arb-icon'; }
    if (directionArrow) directionArrow.textContent = '↓';
    if (gasLabel) gasLabel.textContent = 'L1 Gas Estimation:';
    if (gasValue) gasValue.textContent = '$12.50';
    if (timeValue) timeValue.textContent = '~15 seconds';
    if (btn) btn.textContent = 'Bridge Assets';
  } else {
    if (srcName) srcName.textContent = 'Arbitrum L2';
    if (dstName) dstName.textContent = 'Ethereum Mainnet (L1)';
    if (srcIcon) { srcIcon.innerHTML = arbIconHTML; srcIcon.className = 'network-icon arb-icon'; }
    if (dstIcon) { dstIcon.innerHTML = ethIconHTML; dstIcon.className = 'network-icon eth-icon'; }
    if (directionArrow) directionArrow.textContent = '↓';
    if (gasLabel) gasLabel.textContent = 'L2 Gas Estimation:';
    if (gasValue) gasValue.textContent = '$0.02 (0.000007 ETH)';
    if (timeValue) timeValue.textContent = '~15s (7-Day simulated)';
    if (btn) btn.textContent = 'Withdraw Assets';
  }
  syncWalletUI();
}

function logToBridgeTerminal(text, type = 'info') {
  const terminal = document.getElementById('bridge-terminal-logs');
  if (!terminal) return;

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour12: false });
  const line = document.createElement('div');
  line.className = `terminal-line ${type}`;
  line.innerHTML = `<span class="terminal-line timestamp">[${timeStr}]</span> ${text}`;
  terminal.appendChild(line);
  terminal.scrollTop = terminal.scrollHeight;
}

function runBridgeSequence() {
  if (!walletState.connected) {
    alert("Please connect your mock wallet in the navigation header to test bridging.");
    return;
  }

  const assetSelect = document.getElementById('bridge-asset-select');
  const amountInput = document.getElementById('bridge-amount');
  
  if (!assetSelect || !amountInput) return;

  const asset = assetSelect.value;
  const amount = parseFloat(amountInput.value);

  if (isNaN(amount) || amount <= 0) {
    alert("Please enter a valid amount to bridge.");
    return;
  }

  const consoleCard = document.getElementById('bridge-status-card');
  const successAction = document.getElementById('bridge-success-action');
  const pulse = document.getElementById('rollup-pulse');
  const nodeL1 = document.getElementById('node-l1');
  const nodeL2 = document.getElementById('node-l2');

  if (consoleCard) consoleCard.style.display = 'block';
  if (successAction) successAction.style.display = 'none';
  if (pulse) pulse.classList.remove('animating');

  // Clear logs
  const terminal = document.getElementById('bridge-terminal-logs');
  if (terminal) terminal.innerHTML = '';

  if (bridgeMode === 'deposit') {
    const l1Balance = asset === 'ETH' ? walletState.balances.ethereum.ETH : walletState.balances.ethereum.USDC;
    const requiredL1Eth = asset === 'ETH' ? amount + 0.004 : 0.004;

    if (walletState.balances.ethereum.ETH < requiredL1Eth) {
      alert("Insufficient L1 ETH to cover bridging fee + L1 gas costs.");
      if (consoleCard) consoleCard.style.display = 'none';
      return;
    }
    if (l1Balance < amount) {
      alert(`Insufficient L1 ${asset} balance.`);
      if (consoleCard) consoleCard.style.display = 'none';
      return;
    }

    if (nodeL1) nodeL1.className = 'pipeline-node active';
    if (nodeL2) nodeL2.className = 'pipeline-node';

    logToBridgeTerminal("Bridge Deposit Initiated.", 'info');
    logToBridgeTerminal(`Requesting L1 Wallet signature to escrow ${amount} ${asset}...`, 'info');

    setTimeout(() => {
      logToBridgeTerminal("L1 Signature Approved.", 'success');
      logToBridgeTerminal(`Escrow Lock Transaction Broadcasted to Ethereum Mainnet. Gas paid: 0.004 ETH`, 'info');
      
      setTimeout(() => {
        logToBridgeTerminal("[L1 Block Confirmed] Assets safely locked in L1 Escrow contract.", 'success');
        if (nodeL1) nodeL1.className = 'pipeline-node completed';
        if (pulse) pulse.classList.add('animating');
        logToBridgeTerminal("Arbitrum Sequencer detected L1 Deposit event.", 'info');
        logToBridgeTerminal("Compressing L2 mint instruction and packing it into Optimistic Rollup batch...", 'info');
        
        setTimeout(() => {
          logToBridgeTerminal("Rollup Batch #14092 posted successfully to Ethereum L1 Inbox contract.", 'success');
          logToBridgeTerminal("L2 Sequencer finalizing state transition locally...", 'info');
          if (nodeL2) nodeL2.className = 'pipeline-node active';
          
          setTimeout(() => {
            if (pulse) pulse.classList.remove('animating');
            if (nodeL2) nodeL2.className = 'pipeline-node completed';
            logToBridgeTerminal(`Successfully minted ${amount} L2-${asset} to destination address!`, 'success');
            logToBridgeTerminal("Bridge transaction finalized. State synced.", 'success');
            
            if (successAction) successAction.style.display = 'flex';

            // Update balances
            if (asset === 'ETH') {
              walletState.balances.ethereum.ETH -= (amount + 0.004);
              walletState.balances.arbitrum.ETH += amount;
            } else {
              walletState.balances.ethereum.ETH -= 0.004; // gas
              walletState.balances.ethereum.USDC -= amount;
              walletState.balances.arbitrum.USDC += amount;
            }
            syncWalletUI();
            amountInput.value = '';

            // Add Bridge deposit block to simulator
            addBridgeBlockToSimulator(amount, asset);

          }, 3000);
        }, 4000);
      }, 3000);
    }, 2000);

  } else {
    // Withdrawal Mode
    const l2Balance = asset === 'ETH' ? walletState.balances.arbitrum.ETH : walletState.balances.arbitrum.USDC;
    const requiredL2Eth = asset === 'ETH' ? amount + 0.0001 : 0.0001;

    if (walletState.balances.arbitrum.ETH < requiredL2Eth) {
      alert("Insufficient L2 ETH to cover L2 transaction gas costs.");
      if (consoleCard) consoleCard.style.display = 'none';
      return;
    }
    if (l2Balance < amount) {
      alert(`Insufficient L2 ${asset} balance.`);
      if (consoleCard) consoleCard.style.display = 'none';
      return;
    }

    if (nodeL2) nodeL2.className = 'pipeline-node active';
    if (nodeL1) nodeL1.className = 'pipeline-node';

    logToBridgeTerminal("Bridge Withdrawal Initiated.", 'info');
    logToBridgeTerminal(`Requesting L2 Wallet signature to burn/lock ${amount} L2-${asset}...`, 'info');

    setTimeout(() => {
      logToBridgeTerminal("L2 Signature Approved.", 'success');
      logToBridgeTerminal(`Lock Transaction Broadcasted to Arbitrum L2. Gas paid: 0.0001 ETH`, 'info');
      
      setTimeout(() => {
        logToBridgeTerminal("[L2 Block Confirmed] Assets safely burned/locked on Arbitrum L2.", 'success');
        if (nodeL2) nodeL2.className = 'pipeline-node completed';
        if (pulse) pulse.classList.add('animating');
        logToBridgeTerminal("Arbitrum Sequencer preparing state transition assertion batch...", 'info');
        
        setTimeout(() => {
          logToBridgeTerminal("State assertion Batch #2890 Posted to Ethereum L1 Rollup Contract.", 'success');
          logToBridgeTerminal("Entering 7-Day Challenge Period for Optimistic Rollup validation.", 'info');
          logToBridgeTerminal("Waiting for validator challenge verification...", 'info');
          logToBridgeTerminal("[Simulation Mode] Accelerating 7-day challenge window (5 seconds)...", 'warning');
          
          setTimeout(() => {
            logToBridgeTerminal("7-Day Challenge Window closed. No disputes/fraud proofs submitted.", 'success');
            logToBridgeTerminal("State transition finalized on L1. Funds release authorized.", 'success');
            if (nodeL1) nodeL1.className = 'pipeline-node active';
            logToBridgeTerminal("Executing L1 Outbox claim transaction to unlock escrow funds...", 'info');
            
            setTimeout(() => {
              if (pulse) pulse.classList.remove('animating');
              if (nodeL1) nodeL1.className = 'pipeline-node completed';
              logToBridgeTerminal(`Successfully released ${amount} L1-${asset} to destination Ethereum address!`, 'success');
              logToBridgeTerminal("Withdrawal complete. L1 funds unlocked.", 'success');
              
              if (successAction) successAction.style.display = 'flex';

              // Update balances
              if (asset === 'ETH') {
                walletState.balances.arbitrum.ETH -= (amount + 0.0001);
                walletState.balances.ethereum.ETH += amount;
              } else {
                walletState.balances.arbitrum.ETH -= 0.0001; // gas
                walletState.balances.arbitrum.USDC -= amount;
                walletState.balances.ethereum.USDC += amount;
              }
              syncWalletUI();
              amountInput.value = '';

              // Add Bridge withdrawal block to simulator
              addBridgeWithdrawalBlockToSimulator(amount, asset);

            }, 3000);
          }, 5000);
        }, 4000);
      }, 3000);
    }, 2000);
  }
}

async function addBridgeWithdrawalBlockToSimulator(amount, asset) {
  const newIndex = blockchain.length + 1;
  const prevHash = blockchain.length > 0 ? blockchain[blockchain.length - 1].hash : "0000000000000000000000000000000000000000000000000000000000000000";
  const txs = [
    { from: walletState.address, to: "Bridge Escrow", amount: amount, symbol: asset }
  ];

  blockchain.push({
    index: newIndex,
    nonce: 0,
    prevHash: prevHash,
    transactions: txs,
    data: serializeTransactions(txs),
    hash: ""
  });

  await recalculateAllHashes();
  renderBlockchain();
}

async function addBridgeBlockToSimulator(amount, asset) {
  const newIndex = blockchain.length + 1;
  const prevHash = blockchain.length > 0 ? blockchain[blockchain.length - 1].hash : "0000000000000000000000000000000000000000000000000000000000000000";
  const txs = [
    { from: "Bridge Escrow", to: walletState.address, amount: amount, symbol: asset }
  ];

  blockchain.push({
    index: newIndex,
    nonce: 0,
    prevHash: prevHash,
    transactions: txs,
    data: serializeTransactions(txs),
    hash: ""
  });

  await recalculateAllHashes();
  renderBlockchain();
}


// ----------------------------------------------------
// SMART CONTRACT SANDBOX LOGIC
// ----------------------------------------------------

function initContractsPage() {
  const deployBtn = document.getElementById('deploy-contract-btn');
  const deployStatus = document.getElementById('contract-deploy-status');
  const placeholder = document.getElementById('contract-interactions-placeholder');
  const activeConsole = document.getElementById('contract-interactions-active');
  const addressBadge = document.getElementById('contract-address-badge');

  // Render initial console states
  if (walletState.contractDeployed) {
    if (deployStatus) deployStatus.innerHTML = `Status: <span style="color: var(--color-success); font-weight: 700;">Deployed</span>`;
    if (placeholder) placeholder.style.display = 'none';
    if (activeConsole) activeConsole.style.display = 'block';
    if (addressBadge) addressBadge.textContent = walletState.contractAddress;
  } else {
    if (deployStatus) deployStatus.innerHTML = `Status: <span style="color: var(--color-danger); font-weight: 700;">Not Deployed</span>`;
    if (placeholder) placeholder.style.display = 'flex';
    if (activeConsole) activeConsole.style.display = 'none';
    if (addressBadge) addressBadge.textContent = 'Unassigned';
  }

  // Deploy handler
  if (deployBtn) {
    deployBtn.onclick = () => {
      if (!walletState.connected) {
        alert("Please connect your mock wallet first.");
        return;
      }
      if (walletState.contractDeployed) {
        alert("Contract is already deployed!");
        return;
      }

      deployBtn.disabled = true;
      deployBtn.textContent = "Deploying to L2...";
      
      setTimeout(() => {
        walletState.contractDeployed = true;
        // Generate contract address
        const arr = new Uint8Array(20);
        crypto.getRandomValues(arr);
        walletState.contractAddress = '0x' + Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
        
        // Owner of token contract starts with 0 balance
        walletState.nxtBalances[walletState.address] = 0.00;
        
        // Update UI
        deployBtn.disabled = false;
        deployBtn.textContent = "Deploy Contract to L2";
        if (deployStatus) deployStatus.innerHTML = `Status: <span style="color: var(--color-success); font-weight: 700;">Deployed</span>`;
        if (placeholder) placeholder.style.display = 'none';
        if (activeConsole) activeConsole.style.display = 'block';
        if (addressBadge) addressBadge.textContent = `${walletState.contractAddress.slice(0, 6)}...${walletState.contractAddress.slice(-4)}`;
        
        // Log to Block Simulator
        addDeployBlockToSimulator();
        alert(`Contract compiled and deployed to L2! Address: ${walletState.contractAddress}. Transaction written to Block Simulator.`);
      }, 1500);
    };
  }

  // Console Interaction Tab Switching
  const writeTab = document.getElementById('tab-write-btn');
  const readTab = document.getElementById('tab-read-btn');
  const panelWrite = document.getElementById('panel-write');
  const panelRead = document.getElementById('panel-read');

  if (writeTab && readTab && panelWrite && panelRead) {
    writeTab.onclick = () => {
      writeTab.classList.add('active');
      readTab.classList.remove('active');
      panelWrite.style.display = 'flex';
      panelRead.style.display = 'none';
    };

    readTab.onclick = () => {
      readTab.classList.add('active');
      writeTab.classList.remove('active');
      panelRead.style.display = 'flex';
      panelWrite.style.display = 'none';
    };
  }

  // Contract Call Executors (Write)
  const callMintBtn = document.getElementById('call-mint-btn');
  const callTransferBtn = document.getElementById('call-transfer-btn');

  if (callMintBtn) {
    callMintBtn.onclick = async () => {
      const mintTo = document.getElementById('write-mint-to').value.trim();
      const mintAmount = parseFloat(document.getElementById('write-mint-amount').value);

      if (!mintTo || isNaN(mintAmount) || mintAmount <= 0) {
        alert("Please enter a valid recipient address and positive mint amount.");
        return;
      }

      // NXT Balances increment
      if (walletState.nxtBalances[mintTo] === undefined) {
        walletState.nxtBalances[mintTo] = 0;
      }
      walletState.nxtBalances[mintTo] += mintAmount;
      walletState.nxtTotalSupply += mintAmount;

      document.getElementById('write-mint-to').value = '';
      document.getElementById('write-mint-amount').value = '';

      // Log transaction block to blockchain simulator
      const newIndex = blockchain.length + 1;
      const prevHash = blockchain.length > 0 ? blockchain[blockchain.length - 1].hash : "0000000000000000000000000000000000000000000000000000000000000000";
      const txs = [
        { from: "Contract (Mint)", to: mintTo, amount: mintAmount, symbol: 'NXT' }
      ];

      blockchain.push({
        index: newIndex,
        nonce: 0,
        prevHash: prevHash,
        transactions: txs,
        data: serializeTransactions(txs),
        hash: ""
      });

      await recalculateAllHashes();
      renderBlockchain();

      alert(`Transaction settled! Minted ${mintAmount} NXT to ${mintTo.slice(0, 8)}... A transaction block was written to the Block Simulator.`);
    };
  }

  if (callTransferBtn) {
    callTransferBtn.onclick = async () => {
      const transferTo = document.getElementById('write-transfer-to').value.trim();
      const transferAmount = parseFloat(document.getElementById('write-transfer-amount').value);

      if (!transferTo || isNaN(transferAmount) || transferAmount <= 0) {
        alert("Please enter a valid recipient address and positive transfer amount.");
        return;
      }

      const senderBal = walletState.nxtBalances[walletState.address] || 0;
      if (senderBal < transferAmount) {
        alert(`Insufficient NXT balance. You only have ${senderBal} NXT.`);
        return;
      }

      // Process transfer
      walletState.nxtBalances[walletState.address] -= transferAmount;
      if (walletState.nxtBalances[transferTo] === undefined) {
        walletState.nxtBalances[transferTo] = 0;
      }
      walletState.nxtBalances[transferTo] += transferAmount;

      document.getElementById('write-transfer-to').value = '';
      document.getElementById('write-transfer-amount').value = '';

      // Log transaction block to blockchain simulator
      const newIndex = blockchain.length + 1;
      const prevHash = blockchain.length > 0 ? blockchain[blockchain.length - 1].hash : "0000000000000000000000000000000000000000000000000000000000000000";
      const txs = [
        { from: walletState.address, to: transferTo, amount: transferAmount, symbol: 'NXT' }
      ];

      blockchain.push({
        index: newIndex,
        nonce: 0,
        prevHash: prevHash,
        transactions: txs,
        data: serializeTransactions(txs),
        hash: ""
      });

      await recalculateAllHashes();
      renderBlockchain();

      alert(`Transaction settled! Transferred ${transferAmount} NXT to ${transferTo.slice(0, 8)}... A transaction block was written to the Block Simulator.`);
    };
  }

  // Contract Call Queries (Read)
  const callBalanceBtn = document.getElementById('call-balance-btn');
  const callNameBtn = document.getElementById('call-name-btn');
  const callSymbolBtn = document.getElementById('call-symbol-btn');
  const callSupplyBtn = document.getElementById('call-supply-btn');

  if (callBalanceBtn) {
    callBalanceBtn.onclick = () => {
      const qAddress = document.getElementById('read-balance-addr').value.trim();
      const display = document.getElementById('balance-query-result');
      if (!qAddress) {
        alert("Please enter a valid address to query.");
        return;
      }
      
      const bal = walletState.nxtBalances[qAddress] !== undefined ? walletState.nxtBalances[qAddress] : 0;
      if (display) display.textContent = `Result: ${bal.toFixed(2)} NXT`;
    };
  }

  if (callNameBtn) {
    callNameBtn.onclick = () => {
      document.getElementById('name-query-result').textContent = `Result: "Nexus Token"`;
    };
  }

  if (callSymbolBtn) {
    callSymbolBtn.onclick = () => {
      document.getElementById('symbol-query-result').textContent = `Result: "NXT"`;
    };
  }

  if (callSupplyBtn) {
    callSupplyBtn.onclick = () => {
      document.getElementById('supply-query-result').textContent = `Result: ${walletState.nxtTotalSupply.toFixed(2)} NXT`;
    };
  }
}

async function addDeployBlockToSimulator() {
  const newIndex = blockchain.length + 1;
  const prevHash = blockchain.length > 0 ? blockchain[blockchain.length - 1].hash : "0000000000000000000000000000000000000000000000000000000000000000";
  const txs = [
    { from: walletState.address, to: "Contract Escrow", amount: 0.0, symbol: "Deploy Contract" }
  ];

  blockchain.push({
    index: newIndex,
    nonce: 0,
    prevHash: prevHash,
    transactions: txs,
    data: "NexusToken Contract Deployed",
    hash: ""
  });

  await recalculateAllHashes();
  renderBlockchain();
}


// ----------------------------------------------------
// L1 VS L2 GAS SAVINGS CALCULATOR LOGIC
// ----------------------------------------------------

function initGasPage() {
  const sliderL1 = document.getElementById('gas-slider-l1');
  const sliderEth = document.getElementById('gas-slider-eth');
  
  if (sliderL1) {
    sliderL1.addEventListener('input', () => updateGasCalculator());
  }
  if (sliderEth) {
    sliderEth.addEventListener('input', () => updateGasCalculator());
  }

  updateGasCalculator();
}

function updateGasCalculator() {
  const sliderL1 = document.getElementById('gas-slider-l1');
  const sliderEth = document.getElementById('gas-slider-eth');
  const valL1Gwei = document.getElementById('gas-val-l1-gwei');
  const valEthPrice = document.getElementById('gas-val-eth-price');

  if (!sliderL1 || !sliderEth) return;

  const l1BaseFee = parseInt(sliderL1.value);
  const ethPrice = parseInt(sliderEth.value);

  if (valL1Gwei) valL1Gwei.textContent = `${l1BaseFee} Gwei`;
  if (valEthPrice) valEthPrice.textContent = `$${ethPrice.toLocaleString()} USD`;

  // Transaction type specifications
  const txs = {
    transfer: { l1Gas: 21000, l2Gas: 1500, calldataBytes: 100 },
    swap: { l1Gas: 150000, l2Gas: 8000, calldataBytes: 180 },
    mint: { l1Gas: 250000, l2Gas: 12000, calldataBytes: 240 }
  };

  const feesUSD = {};
  
  // Calculate fees
  // L1 Cost = Gas used * L1 base fee * 1e-9 * ETH price
  // L2 Cost = (L2 execution gas * 0.1 Gwei + L1 rollup Calldata gas) * ETH price
  // L1 rollup Calldata gas = calldata bytes * L1 Base Fee * 0.08 Gwei (highly compressed)
  
  for (const [key, spec] of Object.entries(txs)) {
    const l1FeeEth = spec.l1Gas * l1BaseFee * 1e-9;
    const l1FeeUSD = l1FeeEth * ethPrice;

    const l2ExecutionEth = spec.l2Gas * 0.1 * 1e-9; // L2 execution base fee is 0.1 gwei
    const l2CalldataEth = spec.calldataBytes * l1BaseFee * 0.08 * 1e-9; // compressed batch data
    const l2FeeUSD = (l2ExecutionEth + l2CalldataEth) * ethPrice;

    feesUSD[key] = { l1: l1FeeUSD, l2: l2FeeUSD };
  }

  // Update UI cost displays
  document.getElementById('fee-transfer-l1').textContent = `$${feesUSD.transfer.l1.toFixed(2)}`;
  document.getElementById('fee-transfer-l2').textContent = `$${feesUSD.transfer.l2.toFixed(2)}`;
  document.getElementById('fee-swap-l1').textContent = `$${feesUSD.swap.l1.toFixed(2)}`;
  document.getElementById('fee-swap-l2').textContent = `$${feesUSD.swap.l2.toFixed(2)}`;
  document.getElementById('fee-mint-l1').textContent = `$${feesUSD.mint.l1.toFixed(2)}`;
  document.getElementById('fee-mint-l2').textContent = `$${feesUSD.mint.l2.toFixed(2)}`;

  // Find max L1 cost to scale the chart bars relatively
  const maxL1 = Math.max(feesUSD.transfer.l1, feesUSD.swap.l1, feesUSD.mint.l1);

  // Update bar widths
  const setBarWidth = (elId, value) => {
    const el = document.getElementById(elId);
    if (el) {
      const pct = Math.max(2, (value / maxL1) * 100); // min 2% width
      el.style.width = `${pct}%`;
    }
  };

  setBarWidth('bar-transfer-l1', feesUSD.transfer.l1);
  setBarWidth('bar-transfer-l2', feesUSD.transfer.l2);
  setBarWidth('bar-swap-l1', feesUSD.swap.l1);
  setBarWidth('bar-swap-l2', feesUSD.swap.l2);
  setBarWidth('bar-mint-l1', feesUSD.mint.l1);
  setBarWidth('bar-mint-l2', feesUSD.mint.l2);

  // Update percentages savings
  const avgL1 = (feesUSD.transfer.l1 + feesUSD.swap.l1 + feesUSD.mint.l1) / 3;
  const avgL2 = (feesUSD.transfer.l2 + feesUSD.swap.l2 + feesUSD.mint.l2) / 3;
  const savingsPct = ((1 - avgL2 / avgL1) * 100).toFixed(1);
  
  const pctDisplay = document.getElementById('gas-savings-total-pct');
  if (pctDisplay) pctDisplay.textContent = `${savingsPct}% Average Savings`;

  // Estimate monthly savings (10 transfers, 10 swaps, 2 mints)
  const monthlyL1 = (feesUSD.transfer.l1 * 10) + (feesUSD.swap.l1 * 10) + (feesUSD.mint.l1 * 2);
  const monthlyL2 = (feesUSD.transfer.l2 * 10) + (feesUSD.swap.l2 * 10) + (feesUSD.mint.l2 * 2);
  const savedUSD = Math.max(0, monthlyL1 - monthlyL2).toFixed(2);

  const savedDisplay = document.getElementById('total-savings-usd');
  if (savedDisplay) {
    savedDisplay.textContent = `$${parseFloat(savedUSD).toLocaleString()} Saved!`;
  }
}


// ----------------------------------------------------
// COMPARISON CARD SYNC HOVERS
// ----------------------------------------------------

function initComparisonRowHovers() {
  document.addEventListener('mouseover', (e) => {
    const row = e.target.closest('.comparison-row');
    if (!row) return;

    const compareKey = row.getAttribute('data-compare');
    if (!compareKey) return;

    const card = row.closest('.concept-card');
    if (!card) return;

    card.querySelectorAll(`.comparison-row[data-compare="${compareKey}"]`).forEach(el => {
      el.classList.add('highlighted-row');
    });
  });

  document.addEventListener('mouseout', (e) => {
    const row = e.target.closest('.comparison-row');
    if (!row) return;

    const compareKey = row.getAttribute('data-compare');
    if (!compareKey) return;

    const card = row.closest('.concept-card');
    if (!card) return;

    card.querySelectorAll(`.comparison-row[data-compare="${compareKey}"]`).forEach(el => {
      el.classList.remove('highlighted-row');
    });
  });
}

// ----------------------------------------------------
// CONCEPT TABS & METERS
// ----------------------------------------------------

function initConceptTabs() {
  const conceptCards = document.querySelectorAll('.concept-card');
  conceptCards.forEach(card => {
    const tabBtns = card.querySelectorAll('.concept-tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        
        // Update active tab button
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Update active content panel
        const contentPanels = card.querySelectorAll('.concept-tab-content');
        contentPanels.forEach(panel => {
          panel.classList.remove('active');
          if (panel.getAttribute('data-content') === targetTab) {
            panel.classList.add('active');
            
            // If we switched to the meters tab, trigger animations
            if (targetTab === 'meters') {
              animateMeters(panel);
            } else {
              // Reset meters back to 0 width when hidden so they can animate again
              resetMeters(card);
            }
          }
        });
      });
    });
  });
}

function animateMeters(panel) {
  const bars = panel.querySelectorAll('.meter-bar');
  bars.forEach(bar => {
    const targetVal = bar.getAttribute('data-val');
    // Force reflow/reset before animating
    bar.style.width = '0%';
    setTimeout(() => {
      bar.style.width = targetVal + '%';
    }, 50);
  });
}

function resetMeters(card) {
  const bars = card.querySelectorAll('.meter-bar');
  bars.forEach(bar => {
    bar.style.width = '0%';
  });
}

// ----------------------------------------------------
// CONCEPTS INTERACTIVE QUIZ
// ----------------------------------------------------

let quizScore = 0;
let quizCurrentIndex = 0;
let shuffledCards = [];

function initConceptsQuiz() {
  const quizSection = document.querySelector('.quiz-section');
  if (!quizSection) return;

  const quizCards = Array.from(quizSection.querySelectorAll('.quiz-card'));
  const completionScreen = quizSection.querySelector('.quiz-completion');
  const scoreVal = quizSection.querySelector('#quiz-score-val');
  const totalVal = quizSection.querySelector('#quiz-total-val');
  const restartBtn = quizSection.querySelector('#restart-quiz-btn');

  if (totalVal) {
    totalVal.textContent = quizCards.length;
  }

  // Shuffle and start the quiz
  function startQuiz() {
    quizScore = 0;
    quizCurrentIndex = 0;
    shuffledCards = [...quizCards];
    
    // Fisher-Yates shuffle
    for (let i = shuffledCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledCards[i], shuffledCards[j]] = [shuffledCards[j], shuffledCards[i]];
    }

    // Hide all question cards and completion screen
    quizCards.forEach(card => {
      card.style.display = 'none';
      
      // Re-enable options and clear styling classes
      const options = card.querySelectorAll('.quiz-option');
      options.forEach(opt => {
        opt.disabled = false;
        opt.classList.remove('correct-selected', 'incorrect-selected', 'reveal-correct');
      });

      // Hide feedback block and dynamic action button
      const feedback = card.querySelector('.quiz-feedback');
      if (feedback) {
        feedback.style.display = 'none';
        const actionBtn = feedback.querySelector('.next-q-btn');
        if (actionBtn) {
          actionBtn.remove();
        }
      }
    });

    if (completionScreen) {
      completionScreen.style.display = 'none';
    }

    // Show the first question
    showCurrentQuestion();
  }

  function showCurrentQuestion() {
    if (shuffledCards.length === 0) return;

    const card = shuffledCards[quizCurrentIndex];
    card.style.display = 'block';

    // Update Q number dynamically
    const qNumElement = card.querySelector('.q-num');
    if (qNumElement) {
      qNumElement.textContent = `Q${quizCurrentIndex + 1}.`;
    }

    const options = card.querySelectorAll('.quiz-option');
    const feedback = card.querySelector('.quiz-feedback');
    const feedbackBadge = card.querySelector('.feedback-badge');

    // Remove any previous event listener clones to prevent double-firing
    options.forEach(option => {
      // Recreate option button to clear previous event listeners
      const newOption = option.cloneNode(true);
      option.parentNode.replaceChild(newOption, option);

      newOption.addEventListener('click', () => {
        const currentOptions = card.querySelectorAll('.quiz-option');
        currentOptions.forEach(opt => opt.disabled = true);

        const isCorrect = newOption.classList.contains('correct');

        if (isCorrect) {
          newOption.classList.add('correct-selected');
          quizScore++;
          
          feedbackBadge.textContent = 'Correct';
          feedbackBadge.className = 'feedback-badge correct';
        } else {
          newOption.classList.add('incorrect-selected');
          
          // Find and highlight correct answer
          const correctOption = card.querySelector('.quiz-option.correct');
          if (correctOption) {
            correctOption.classList.add('reveal-correct');
          }

          feedbackBadge.textContent = 'Incorrect';
          feedbackBadge.className = 'feedback-badge incorrect';
        }

        // Show feedback block
        feedback.style.display = 'flex';

        // Add dynamically a next/completion button to the feedback card
        let actionBtn = feedback.querySelector('.next-q-btn');
        if (!actionBtn) {
          actionBtn = document.createElement('button');
          actionBtn.className = 'btn btn-primary next-q-btn';
          feedback.appendChild(actionBtn);
        }

        if (quizCurrentIndex < shuffledCards.length - 1) {
          actionBtn.textContent = 'Next Question';
          actionBtn.onclick = () => {
            card.style.display = 'none';
            quizCurrentIndex++;
            showCurrentQuestion();
          };
        } else {
          actionBtn.textContent = 'Show Results';
          actionBtn.onclick = () => {
            card.style.display = 'none';
            if (completionScreen && scoreVal) {
              scoreVal.textContent = quizScore;
              completionScreen.style.display = 'block';
            }
          };
        }
      });
    });
  }

  // Initialize
  startQuiz();

  if (restartBtn) {
    restartBtn.addEventListener('click', startQuiz);
  }
}

// ----------------------------------------------------
// KEYPAIR SIMULATOR
// ----------------------------------------------------

function initKeypairSimulator() {
  const genBtn = document.getElementById('sim-gen-keys-btn');
  const privInput = document.getElementById('sim-priv-key');
  const pubInput = document.getElementById('sim-pub-key');
  const signSection = document.getElementById('sim-signing-section');
  const msgInput = document.getElementById('sim-msg-input');
  const signBtn = document.getElementById('sim-sign-msg-btn');
  const sigOutput = document.getElementById('sim-sig-output');
  const verifSection = document.getElementById('sim-verification-section');
  const verifPub = document.getElementById('verif-pub-key');
  const verifMsg = document.getElementById('verif-msg');
  const verifStatus = document.getElementById('verif-status');

  if (!genBtn || !privInput || !pubInput) return;

  let activePrivKey = '';
  let activePubKey = '';
  let signedMessage = '';
  let activeSignature = '';

  // Generate random mock keys
  genBtn.addEventListener('click', () => {
    // Generate private key: 64 random hex characters
    const hexChars = '0123456789abcdef';
    let privKey = '';
    for (let i = 0; i < 64; i++) {
      privKey += hexChars[Math.floor(Math.random() * 16)];
    }
    
    // Generate public key / address: 0x + 40 random hex characters
    let pubAddress = '0x';
    for (let i = 0; i < 40; i++) {
      pubAddress += hexChars[Math.floor(Math.random() * 16)];
    }

    activePrivKey = privKey;
    activePubKey = pubAddress;

    privInput.value = privKey;
    pubInput.value = pubAddress;

    // Show Step 2 (signing) and reset Step 3
    if (signSection) {
      signSection.style.display = 'flex';
    }
    if (verifSection) {
      verifSection.style.display = 'none';
    }
    if (sigOutput) {
      sigOutput.value = '';
    }
    
    // Reset verification status
    if (verifStatus) {
      verifStatus.textContent = '⌛ Waiting to verify...';
      verifStatus.className = 'verif-status waiting';
    }
  });

  // Sign message
  if (signBtn) {
    signBtn.addEventListener('click', async () => {
      if (!activePrivKey) return;

      const message = msgInput.value;
      signedMessage = message;

      // Cryptographic mock signature: sha256(privKey + message)
      const signaturePayload = activePrivKey + message;
      const signatureHash = await sha256(signaturePayload);
      
      // Format as simulated signature (0x + hash + "1c" suffix)
      const simulatedSignature = '0x' + signatureHash + '1c';
      activeSignature = simulatedSignature;

      if (sigOutput) {
        sigOutput.value = simulatedSignature;
      }

      // Show Step 3 (verification)
      if (verifSection) {
        verifSection.style.display = 'flex';
      }

      if (verifPub) {
        verifPub.textContent = activePubKey;
      }
      if (verifMsg) {
        verifMsg.textContent = message;
      }
      if (verifStatus) {
        verifStatus.textContent = '✔️ Signature Verified Successfully!';
        verifStatus.className = 'verif-status verified';
      }
    });
  }

  // Detect message modification
  if (msgInput) {
    msgInput.addEventListener('input', () => {
      // If signature exists, check if message matches what was signed
      if (activeSignature && verifSection && verifSection.style.display !== 'none') {
        const currentMsg = msgInput.value;
        if (verifMsg) {
          verifMsg.textContent = currentMsg;
        }

        if (currentMsg !== signedMessage) {
          verifStatus.textContent = '❌ Signature Verification Failed (Mismatch!)';
          verifStatus.className = 'verif-status text-danger';
        } else {
          verifStatus.textContent = '✔️ Signature Verified Successfully!';
          verifStatus.className = 'verif-status verified';
        }
      }
    });
  }
}

let hashTabInitialized = false;
function initHashTab() {
  if (hashTabInitialized) return;
  hashTabInitialized = true;

  const dataArea = document.getElementById('hash-input-data');
  const outputField = document.getElementById('hash-output-field');

  if (!dataArea || !outputField) return;

  const updateHash = async () => {
    const text = dataArea.value;
    const computedHash = await sha256(text);
    outputField.textContent = computedHash;
  };

  dataArea.addEventListener('input', updateHash);
  updateHash(); // initial update
}

let blockTabInitialized = false;
function initBlockTab() {
  if (blockTabInitialized) return;
  blockTabInitialized = true;

  const blockNum = document.getElementById('single-block-num');
  const blockNonce = document.getElementById('single-block-nonce');
  const blockData = document.getElementById('single-block-data');
  const blockHash = document.getElementById('single-block-hash');
  const mineBtn = document.getElementById('single-block-mine-btn');
  const blockCard = document.getElementById('single-block-card');

  if (!blockNum || !blockNonce || !blockData || !blockHash || !mineBtn || !blockCard) return;

  const updateBlockHash = async () => {
    const num = blockNum.value || '0';
    const nonce = blockNonce.value || '0';
    const data = blockData.value || '';
    const combinedText = num + nonce + data;
    const hash = await sha256(combinedText);
    blockHash.textContent = hash;

    // Verify validity based on global difficulty
    const diff = difficulty || 2;
    const targetZeros = '0'.repeat(diff);
    if (hash.startsWith(targetZeros)) {
      blockCard.style.borderColor = 'var(--color-success)';
      blockCard.style.background = 'rgba(0, 255, 210, 0.02)';
      blockCard.style.boxShadow = '0 0 15px rgba(0, 255, 210, 0.05)';
    } else {
      blockCard.style.borderColor = 'var(--color-danger)';
      blockCard.style.background = 'rgba(255, 55, 95, 0.02)';
      blockCard.style.boxShadow = '0 0 15px rgba(255, 55, 95, 0.05)';
    }
  };

  const inputs = [blockNum, blockNonce, blockData];
  inputs.forEach(input => {
    input.addEventListener('input', updateBlockHash);
  });

  mineBtn.addEventListener('click', async () => {
    mineBtn.disabled = true;
    mineBtn.textContent = 'Mining...';

    const num = blockNum.value || '0';
    const data = blockData.value || '';
    const diff = difficulty || 2;
    const targetZeros = '0'.repeat(diff);

    let nonce = 0;
    let hash = '';

    while (nonce < 10000000) {
      hash = await sha256(num + nonce + data);
      if (hash.startsWith(targetZeros)) {
        break;
      }
      nonce++;
    }

    blockNonce.value = nonce;
    await updateBlockHash();

    mineBtn.textContent = 'Mine Block';
    mineBtn.disabled = false;
  });

  // Re-run whenever difficulty slider changes
  const diffSlider = document.getElementById('difficulty-slider');
  if (diffSlider) {
    diffSlider.addEventListener('input', updateBlockHash);
  }

  updateBlockHash(); // initial update
}

// Peer chains definition
let peerA = [
  { num: 1, nonce: 72608, data: "", prev: "0000000000000000000000000000000000000000000000000000000000000000", hash: "" },
  { num: 2, nonce: 35230, data: "", prev: "", hash: "" },
  { num: 3, nonce: 12937, data: "", prev: "", hash: "" }
];
let peerB = JSON.parse(JSON.stringify(peerA));
let peerC = JSON.parse(JSON.stringify(peerA));

let peerAInitialized = false;
let peerBInitialized = false;
let peerCInitialized = false;

async function initDistributedTab() {
  if (peerAInitialized) return;
  peerAInitialized = true;

  // Run initial calculations
  await recalculatePeerChain(peerA);
  await recalculatePeerChain(peerB);
  await recalculatePeerChain(peerC);

  renderPeer('a', peerA, 'peer-a-blocks');
  renderPeer('b', peerB, 'peer-b-blocks');
  renderPeer('c', peerC, 'peer-c-blocks');
  updateDistributedConsensus();

  // difficulty listener
  const diffSlider = document.getElementById('difficulty-slider');
  if (diffSlider) {
    diffSlider.addEventListener('input', async () => {
      await recalculatePeerChain(peerA);
      await recalculatePeerChain(peerB);
      await recalculatePeerChain(peerC);
      renderPeer('a', peerA, 'peer-a-blocks');
      renderPeer('b', peerB, 'peer-b-blocks');
      renderPeer('c', peerC, 'peer-c-blocks');
      updateDistributedConsensus();
    });
  }
}

function updateDistributedConsensus() {
  const banner = document.getElementById('dist-consensus-banner');
  const icon = document.getElementById('dist-consensus-icon');
  const text = document.getElementById('dist-consensus-text');

  if (!banner || !icon || !text) return;

  // Check validity of all chains
  const allValidA = peerA.every(b => b.isValid);
  const allValidB = peerB.every(b => b.isValid);
  const allValidC = peerC.every(b => b.isValid);

  const hashA = peerA[peerA.length - 1].hash;
  const hashB = peerB[peerB.length - 1].hash;
  const hashC = peerC[peerC.length - 1].hash;

  if (!allValidA || !allValidB || !allValidC) {
    banner.style.borderColor = 'rgba(245, 158, 11, 0.4)';
    banner.style.background = 'rgba(245, 158, 11, 0.05)';
    icon.textContent = '⚠️';
    text.textContent = 'Consensus Status: Pending. Invalid (unmined) blocks detected on one or more nodes.';
    text.style.color = 'var(--color-warning)';
    icon.style.filter = 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.4))';
  } else if (hashA === hashB && hashB === hashC) {
    banner.style.borderColor = 'rgba(16, 185, 129, 0.4)';
    banner.style.background = 'rgba(16, 185, 129, 0.05)';
    icon.textContent = '🟢';
    text.textContent = 'Consensus Status: Verified. All nodes have identical, valid chains.';
    text.style.color = 'var(--color-success)';
    icon.style.filter = 'drop-shadow(0 0 6px rgba(16, 185, 129, 0.4))';
  } else {
    banner.style.borderColor = 'rgba(239, 68, 68, 0.4)';
    banner.style.background = 'rgba(239, 68, 68, 0.05)';
    icon.textContent = '🔴';
    
    // Find which peer has mismatching chain
    let brokenNode = 'B';
    if (hashA !== hashC && hashB === hashC) brokenNode = 'A';
    else if (hashA === hashB && hashB !== hashC) brokenNode = 'C';
    else if (hashA !== hashB && hashA !== hashC) brokenNode = 'B and C';

    text.textContent = `Consensus Status: Broken. Node Peer ${brokenNode} has mismatching/tampered block data!`;
    text.style.color = 'var(--color-danger)';
    icon.style.filter = 'drop-shadow(0 0 6px rgba(239, 68, 68, 0.4))';
  }
}

async function recalculatePeerChain(chain) {
  const diff = difficulty || 2;
  const targetZeros = '0'.repeat(diff);
  
  for (let i = 0; i < chain.length; i++) {
    if (i > 0) {
      chain[i].prev = chain[i - 1].hash;
    }
    const textToHash = chain[i].num + chain[i].nonce + chain[i].data + chain[i].prev;
    chain[i].hash = await sha256(textToHash);
    chain[i].isValid = chain[i].hash.startsWith(targetZeros);
  }
}

function renderPeer(peerId, chain, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = '';
  chain.forEach((block, idx) => {
    const isValid = block.isValid;

    const card = document.createElement('div');
    card.className = `glass-panel sim-block ${isValid ? 'valid' : 'invalid'}`;
    card.style = `min-width: 280px; flex: 1 1 280px;`;
    
    card.innerHTML = `
      <div class="block-meta">
        <span class="block-num">BLOCK #${block.num}</span>
        <span class="block-status-badge ${isValid ? 'status-valid' : 'status-invalid'}">
          ${isValid ? '● VALID' : '● INVALID'}
        </span>
      </div>
      
      <div class="sim-form-group">
        <label class="sim-label" for="peer-${peerId}-block-${idx}-nonce">Nonce</label>
        <input type="number" class="sim-input sim-input-mono peer-nonce-input" data-peer="${peerId}" data-idx="${idx}" id="peer-${peerId}-block-${idx}-nonce" value="${block.nonce}">
      </div>

      <div class="sim-form-group">
        <label class="sim-label" for="peer-${peerId}-block-${idx}-data">Data Input</label>
        <textarea class="sim-input sim-input-mono peer-data-input" data-peer="${peerId}" data-idx="${idx}" id="peer-${peerId}-block-${idx}-data" rows="3" placeholder="Empty">${block.data}</textarea>
      </div>

      <div class="sim-form-group">
        <span class="sim-label">Previous Hash</span>
        <div class="hash-display-box">
          <span class="hash-label-inside">PREV</span>
          <span class="hash-value">${block.prev}</span>
        </div>
      </div>

      <div class="sim-form-group">
        <span class="sim-label">Block Hash</span>
        <div class="hash-display-box">
          <span class="hash-label-inside">HASH</span>
          <span class="hash-value">${block.hash}</span>
        </div>
      </div>

      <div class="sim-actions" style="margin-top: 12px;">
        <button class="btn btn-secondary peer-mine-btn" data-peer="${peerId}" data-idx="${idx}" style="width: 100%;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px; vertical-align: middle; display: inline-block;">
            <path d="M21.73 18l-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3z"/>
          </svg> Mine Block
        </button>
      </div>
    `;
    container.appendChild(card);
  });

  // Bind Listeners
  container.querySelectorAll('.peer-nonce-input').forEach(input => {
    input.addEventListener('input', async (e) => {
      const pId = e.target.getAttribute('data-peer');
      const index = parseInt(e.target.getAttribute('data-idx'));
      const activeChain = pId === 'a' ? peerA : (pId === 'b' ? peerB : peerC);
      activeChain[index].nonce = parseInt(e.target.value) || 0;
      await recalculatePeerChain(activeChain);
      renderPeer(pId, activeChain, containerId);
      updateDistributedConsensus();
    });
  });

  container.querySelectorAll('.peer-data-input').forEach(input => {
    input.addEventListener('input', async (e) => {
      const pId = e.target.getAttribute('data-peer');
      const index = parseInt(e.target.getAttribute('data-idx'));
      const activeChain = pId === 'a' ? peerA : (pId === 'b' ? peerB : peerC);
      activeChain[index].data = e.target.value;
      await recalculatePeerChain(activeChain);
      renderPeer(pId, activeChain, containerId);
      updateDistributedConsensus();
    });
  });

  container.querySelectorAll('.peer-mine-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const pId = e.target.getAttribute('data-peer');
      const index = parseInt(e.target.getAttribute('data-idx'));
      const activeChain = pId === 'a' ? peerA : (pId === 'b' ? peerB : peerC);
      
      btn.disabled = true;
      btn.textContent = 'Mining...';

      const diff = difficulty || 2;
      const targetZeros = '0'.repeat(diff);

      let nonce = 0;
      let hash = '';

      while (nonce < 10000000) {
        const textToHash = activeChain[index].num + nonce + activeChain[index].data + activeChain[index].prev;
        hash = await sha256(textToHash);
        if (hash.startsWith(targetZeros)) {
          break;
        }
        nonce++;
      }

      activeChain[index].nonce = nonce;
      await recalculatePeerChain(activeChain);
      renderPeer(pId, activeChain, containerId);
      updateDistributedConsensus();
    });
  });
}

let tokensChain = [
  {
    num: 1,
    nonce: 49202,
    txs: [
      { value: "25.00", from: "Darcy", to: "Bingley" },
      { value: "10.00", from: "Jane", to: "Elizabeth" },
      { value: "83.50", from: "Bingley", to: "Darcy" }
    ],
    prev: "0000000000000000000000000000000000000000000000000000000000000000",
    hash: ""
  },
  {
    num: 2,
    nonce: 10482,
    txs: [
      { value: "5.00", from: "Elizabeth", to: "Jane" },
      { value: "2.00", from: "Bingley", to: "Elizabeth" }
    ],
    prev: "",
    hash: ""
  },
  {
    num: 3,
    nonce: 58219,
    txs: [
      { value: "15.00", from: "Darcy", to: "Elizabeth" }
    ],
    prev: "",
    hash: ""
  }
];

let tokensChainInitialized = false;

async function initTokensTab() {
  if (tokensChainInitialized) return;
  tokensChainInitialized = true;

  await recalculateTokensChain();
  renderTokensChain();

  const diffSlider = document.getElementById('difficulty-slider');
  if (diffSlider) {
    diffSlider.addEventListener('input', async () => {
      await recalculateTokensChain();
      renderTokensChain();
    });
  }
}

async function recalculateTokensChain() {
  const diff = difficulty || 2;
  const targetZeros = '0'.repeat(diff);

  for (let i = 0; i < tokensChain.length; i++) {
    if (i > 0) {
      tokensChain[i].prev = tokensChain[i - 1].hash;
    }
    
    let txsString = '';
    tokensChain[i].txs.forEach(tx => {
      txsString += tx.value + tx.from + tx.to;
    });

    const textToHash = tokensChain[i].num + tokensChain[i].nonce + txsString + tokensChain[i].prev;
    tokensChain[i].hash = await sha256(textToHash);
    tokensChain[i].isValid = tokensChain[i].hash.startsWith(targetZeros);
  }
}

function renderTokensChain() {
  const container = document.getElementById('tokens-blocks-container');
  if (!container) return;

  container.innerHTML = '';
  tokensChain.forEach((block, blockIdx) => {
    const isValid = block.isValid;

    const card = document.createElement('div');
    card.className = `glass-panel sim-block ${isValid ? 'valid' : 'invalid'}`;
    card.style = `min-width: 320px; flex: 1 1 320px;`;
    
    let txsHtml = '';
    block.txs.forEach((tx, txIdx) => {
      txsHtml += `
        <div style="display: flex; gap: 6px; align-items: center; background: rgba(0, 0, 0, 0.15); padding: 4px; border-radius: var(--radius-sm); border: 1px solid rgba(255,255,255,0.05); margin-bottom: 4px;">
          <span style="font-size: 0.75rem; color: var(--color-text-muted); font-weight: 700;">$</span>
          <input type="text" class="tx-val-input sim-input" data-bidx="${blockIdx}" data-tidx="${txIdx}" value="${tx.value}" style="width: 50px; padding: 2px 4px; background: rgba(0, 0, 0, 0.3); border: none; border-radius: 2px; color: var(--color-text-primary); font-family: var(--font-mono); font-size: 0.75rem; outline: none; text-align: right;">
          <span style="font-size: 0.75rem; color: var(--color-text-muted);">From</span>
          <input type="text" class="tx-from-input sim-input" data-bidx="${blockIdx}" data-tidx="${txIdx}" value="${tx.from}" style="width: 60px; padding: 2px 4px; background: rgba(0, 0, 0, 0.3); border: none; border-radius: 2px; color: var(--color-text-primary); font-family: var(--font-mono); font-size: 0.75rem; outline: none;">
          <span style="font-size: 0.75rem; color: var(--color-text-muted);">➔</span>
          <input type="text" class="tx-to-input sim-input" data-bidx="${blockIdx}" data-tidx="${txIdx}" value="${tx.to}" style="width: 60px; padding: 2px 4px; background: rgba(0, 0, 0, 0.3); border: none; border-radius: 2px; color: var(--color-text-primary); font-family: var(--font-mono); font-size: 0.75rem; outline: none;">
        </div>
      `;
    });

    card.innerHTML = `
      <div class="block-meta">
        <span class="block-num">BLOCK #${block.num}</span>
        <span class="block-status-badge ${isValid ? 'status-valid' : 'status-invalid'}">
          ${isValid ? '● VALID' : '● INVALID'}
        </span>
      </div>
      
      <div class="sim-form-group">
        <label class="sim-label" for="tokens-block-${blockIdx}-nonce">Nonce</label>
        <input type="number" class="sim-input sim-input-mono tokens-nonce-input" data-idx="${blockIdx}" id="tokens-block-${blockIdx}-nonce" value="${block.nonce}">
      </div>

      <div class="sim-form-group">
        <label class="sim-label">Transaction Ledger</label>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          ${txsHtml}
        </div>
      </div>

      <div class="sim-form-group">
        <span class="sim-label">Previous Hash</span>
        <div class="hash-display-box">
          <span class="hash-label-inside">PREV</span>
          <span class="hash-value">${block.prev}</span>
        </div>
      </div>

      <div class="sim-form-group">
        <span class="sim-label">Block Hash</span>
        <div class="hash-display-box">
          <span class="hash-label-inside">HASH</span>
          <span class="hash-value">${block.hash}</span>
        </div>
      </div>

      <div class="sim-actions" style="margin-top: 12px;">
        <button class="btn btn-secondary tokens-mine-btn" data-idx="${blockIdx}" style="width: 100%;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px; vertical-align: middle; display: inline-block;">
            <path d="M21.73 18l-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3z"/>
          </svg> Mine Block
        </button>
      </div>
    `;
    container.appendChild(card);
  });

  // Bind Listeners
  container.querySelectorAll('.tokens-nonce-input').forEach(input => {
    input.addEventListener('input', async (e) => {
      const idx = parseInt(e.target.getAttribute('data-idx'));
      tokensChain[idx].nonce = parseInt(e.target.value) || 0;
      await recalculateTokensChain();
      renderTokensChain();
    });
  });

  container.querySelectorAll('.tx-val-input').forEach(input => {
    input.addEventListener('input', async (e) => {
      const bidx = parseInt(e.target.getAttribute('data-bidx'));
      const tidx = parseInt(e.target.getAttribute('data-tidx'));
      tokensChain[bidx].txs[tidx].value = e.target.value;
      await recalculateTokensChain();
      renderTokensChain();
    });
  });

  container.querySelectorAll('.tx-from-input').forEach(input => {
    input.addEventListener('input', async (e) => {
      const bidx = parseInt(e.target.getAttribute('data-bidx'));
      const tidx = parseInt(e.target.getAttribute('data-tidx'));
      tokensChain[bidx].txs[tidx].from = e.target.value;
      await recalculateTokensChain();
      renderTokensChain();
    });
  });

  container.querySelectorAll('.tx-to-input').forEach(input => {
    input.addEventListener('input', async (e) => {
      const bidx = parseInt(e.target.getAttribute('data-bidx'));
      const tidx = parseInt(e.target.getAttribute('data-tidx'));
      tokensChain[bidx].txs[tidx].to = e.target.value;
      await recalculateTokensChain();
      renderTokensChain();
    });
  });

  container.querySelectorAll('.tokens-mine-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const idx = parseInt(e.target.getAttribute('data-idx'));
      btn.disabled = true;
      btn.textContent = 'Mining...';

      const diff = difficulty || 2;
      const targetZeros = '0'.repeat(diff);

      let nonce = 0;
      let hash = '';

      let txsString = '';
      tokensChain[idx].txs.forEach(tx => {
        txsString += tx.value + tx.from + tx.to;
      });

      while (nonce < 10000000) {
        const textToHash = tokensChain[idx].num + nonce + txsString + tokensChain[idx].prev;
        hash = await sha256(textToHash);
        if (hash.startsWith(targetZeros)) {
          break;
        }
        nonce++;
      }

      tokensChain[idx].nonce = nonce;
      await recalculateTokensChain();
      renderTokensChain();
    });
  });
}

let coinbaseChain = [
  {
    num: 1,
    nonce: 29482,
    coinbase: { value: "100.00", to: "Anders" },
    txs: [
      { value: "25.00", from: "Anders", to: "Darcy" },
      { value: "10.00", from: "Anders", to: "Elizabeth" }
    ],
    prev: "0000000000000000000000000000000000000000000000000000000000000000",
    hash: ""
  },
  {
    num: 2,
    nonce: 94812,
    coinbase: { value: "100.00", to: "Anders" },
    txs: [
      { value: "10.00", from: "Darcy", to: "Elizabeth" },
      { value: "5.00", from: "Elizabeth", to: "Jane" }
    ],
    prev: "",
    hash: ""
  },
  {
    num: 3,
    nonce: 10294,
    coinbase: { value: "100.00", to: "Anders" },
    txs: [
      { value: "15.00", from: "Anders", to: "Bingley" },
      { value: "20.00", from: "Elizabeth", to: "Darcy" }
    ],
    prev: "",
    hash: ""
  }
];

let coinbaseChainInitialized = false;

async function initCoinbaseTab() {
  if (coinbaseChainInitialized) return;
  coinbaseChainInitialized = true;

  await recalculateCoinbaseChain();
  renderCoinbaseChain();
  renderCoinbaseBalances();

  const diffSlider = document.getElementById('difficulty-slider');
  if (diffSlider) {
    diffSlider.addEventListener('input', async () => {
      await recalculateCoinbaseChain();
      renderCoinbaseChain();
      renderCoinbaseBalances();
    });
  }
}

async function recalculateCoinbaseChain() {
  const diff = difficulty || 2;
  const targetZeros = '0'.repeat(diff);

  for (let i = 0; i < coinbaseChain.length; i++) {
    if (i > 0) {
      coinbaseChain[i].prev = coinbaseChain[i - 1].hash;
    }
    
    let txsString = coinbaseChain[i].coinbase.value + coinbaseChain[i].coinbase.to;
    coinbaseChain[i].txs.forEach(tx => {
      txsString += tx.value + tx.from + tx.to;
    });

    const textToHash = coinbaseChain[i].num + coinbaseChain[i].nonce + txsString + coinbaseChain[i].prev;
    coinbaseChain[i].hash = await sha256(textToHash);
    coinbaseChain[i].isValid = coinbaseChain[i].hash.startsWith(targetZeros);
  }
}

function renderCoinbaseBalances() {
  const listContainer = document.getElementById('coinbase-balances-list');
  if (!listContainer) return;

  const balances = {
    "Anders": 0.00,
    "Darcy": 0.00,
    "Elizabeth": 0.00,
    "Jane": 0.00,
    "Bingley": 0.00
  };

  coinbaseChain.forEach(block => {
    // Coinbase minting
    const cbTo = block.coinbase.to;
    const cbVal = parseFloat(block.coinbase.value) || 0;
    if (balances[cbTo] !== undefined) {
      balances[cbTo] += cbVal;
    } else {
      balances[cbTo] = cbVal;
    }

    // Normal transactions
    block.txs.forEach(tx => {
      const from = tx.from;
      const to = tx.to;
      const val = parseFloat(tx.value) || 0;

      if (balances[from] !== undefined) {
        balances[from] -= val;
      }
      if (balances[to] !== undefined) {
        balances[to] += val;
      } else {
        balances[to] = val;
      }
    });
  });

  listContainer.innerHTML = '';
  Object.keys(balances).forEach(user => {
    const isNegative = balances[user] < 0;
    const colorStyle = isNegative ? 'color: var(--color-danger); font-weight: 700;' : 'color: var(--color-success); font-weight: 700;';
    const amountStr = isNegative ? `-$${Math.abs(balances[user]).toFixed(2)}` : `$${balances[user].toFixed(2)}`;

    const row = document.createElement('div');
    row.style = 'display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: rgba(0, 0, 0, 0.2); border-radius: var(--radius-sm); border: 1px solid rgba(255,255,255,0.05);';
    row.innerHTML = `
      <span style="font-family: var(--font-mono); font-size: 0.9rem; color: var(--color-text-primary); font-weight: 600;">${user}</span>
      <span style="font-family: var(--font-mono); font-size: 0.95rem; ${colorStyle}">${amountStr}</span>
    `;
    listContainer.appendChild(row);
  });
}

function renderCoinbaseChain() {
  const container = document.getElementById('coinbase-blocks-container');
  if (!container) return;

  container.innerHTML = '';
  coinbaseChain.forEach((block, blockIdx) => {
    const isValid = block.isValid;

    const card = document.createElement('div');
    card.className = `glass-panel sim-block ${isValid ? 'valid' : 'invalid'}`;
    card.style = `min-width: 320px; flex: 1 1 320px;`;
    
    let txsHtml = '';
    block.txs.forEach((tx, txIdx) => {
      txsHtml += `
        <div style="display: flex; gap: 4px; align-items: center; background: rgba(0, 0, 0, 0.15); padding: 4px; border-radius: var(--radius-sm); border: 1px solid rgba(255,255,255,0.05); margin-bottom: 4px;">
          <span style="font-size: 0.7rem; color: var(--color-text-muted); font-weight: 700;">$</span>
          <input type="text" class="cb-tx-val-input sim-input" data-bidx="${blockIdx}" data-tidx="${txIdx}" value="${tx.value}" style="width: 40px; padding: 2px; background: rgba(0, 0, 0, 0.3); border: none; border-radius: 2px; color: var(--color-text-primary); font-family: var(--font-mono); font-size: 0.75rem; outline: none; text-align: right;">
          <span style="font-size: 0.7rem; color: var(--color-text-muted);">From</span>
          <input type="text" class="cb-tx-from-input sim-input" data-bidx="${blockIdx}" data-tidx="${txIdx}" value="${tx.from}" style="width: 50px; padding: 2px; background: rgba(0, 0, 0, 0.3); border: none; border-radius: 2px; color: var(--color-text-primary); font-family: var(--font-mono); font-size: 0.75rem; outline: none;">
          <span style="font-size: 0.7rem; color: var(--color-text-muted);">➔</span>
          <input type="text" class="cb-tx-to-input sim-input" data-bidx="${blockIdx}" data-tidx="${txIdx}" value="${tx.to}" style="width: 50px; padding: 2px; background: rgba(0, 0, 0, 0.3); border: none; border-radius: 2px; color: var(--color-text-primary); font-family: var(--font-mono); font-size: 0.75rem; outline: none;">
        </div>
      `;
    });

    card.innerHTML = `
      <div class="block-meta">
        <span class="block-num">BLOCK #${block.num}</span>
        <span class="block-status-badge ${isValid ? 'status-valid' : 'status-invalid'}">
          ${isValid ? '● VALID' : '● INVALID'}
        </span>
      </div>
      
      <div class="sim-form-group">
        <label class="sim-label" for="coinbase-block-${blockIdx}-nonce">Nonce</label>
        <input type="number" class="sim-input sim-input-mono coinbase-nonce-input" data-idx="${blockIdx}" id="coinbase-block-${blockIdx}-nonce" value="${block.nonce}">
      </div>

      <div class="sim-form-group" style="background: rgba(0, 242, 254, 0.05); padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
        <label class="sim-label" style="color: var(--color-primary); margin-bottom: 6px;">COINBASE TRANSACTION</label>
        <div style="display: flex; gap: 6px; align-items: center;">
          <span style="font-size: 0.75rem; color: var(--color-text-muted); font-weight: 700;">$</span>
          <input type="text" class="coinbase-val-input sim-input" data-idx="${blockIdx}" value="${block.coinbase.value}" style="width: 55px; padding: 2px 4px; background: rgba(0, 0, 0, 0.3); border: none; border-radius: 2px; color: var(--color-text-primary); font-family: var(--font-mono); font-size: 0.75rem; outline: none; text-align: right;">
          <span style="font-size: 0.75rem; color: var(--color-text-muted);">To</span>
          <input type="text" class="coinbase-to-input sim-input" data-idx="${blockIdx}" value="${block.coinbase.to}" style="width: 100px; padding: 2px 4px; background: rgba(0, 0, 0, 0.3); border: none; border-radius: 2px; color: var(--color-text-primary); font-family: var(--font-mono); font-size: 0.75rem; outline: none;">
        </div>
      </div>

      <div class="sim-form-group">
        <label class="sim-label">Transactions Ledger</label>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          ${txsHtml}
        </div>
      </div>

      <div class="sim-form-group">
        <span class="sim-label">Previous Hash</span>
        <div class="hash-display-box">
          <span class="hash-label-inside">PREV</span>
          <span class="hash-value">${block.prev}</span>
        </div>
      </div>

      <div class="sim-form-group">
        <span class="sim-label">Block Hash</span>
        <div class="hash-display-box">
          <span class="hash-label-inside">HASH</span>
          <span class="hash-value">${block.hash}</span>
        </div>
      </div>

      <div class="sim-actions" style="margin-top: 12px;">
        <button class="btn btn-secondary coinbase-mine-btn" data-idx="${blockIdx}" style="width: 100%;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px; vertical-align: middle; display: inline-block;">
            <path d="M21.73 18l-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3z"/>
          </svg> Mine Block
        </button>
      </div>
    `;
    container.appendChild(card);
  });

  // Bind Listeners
  container.querySelectorAll('.coinbase-nonce-input').forEach(input => {
    input.addEventListener('input', async (e) => {
      const idx = parseInt(e.target.getAttribute('data-idx'));
      coinbaseChain[idx].nonce = parseInt(e.target.value) || 0;
      await recalculateCoinbaseChain();
      renderCoinbaseChain();
      renderCoinbaseBalances();
    });
  });

  container.querySelectorAll('.coinbase-val-input').forEach(input => {
    input.addEventListener('input', async (e) => {
      const idx = parseInt(e.target.getAttribute('data-idx'));
      coinbaseChain[idx].coinbase.value = e.target.value;
      await recalculateCoinbaseChain();
      renderCoinbaseChain();
      renderCoinbaseBalances();
    });
  });

  container.querySelectorAll('.coinbase-to-input').forEach(input => {
    input.addEventListener('input', async (e) => {
      const idx = parseInt(e.target.getAttribute('data-idx'));
      coinbaseChain[idx].coinbase.to = e.target.value;
      await recalculateCoinbaseChain();
      renderCoinbaseChain();
      renderCoinbaseBalances();
    });
  });

  container.querySelectorAll('.cb-tx-val-input').forEach(input => {
    input.addEventListener('input', async (e) => {
      const bidx = parseInt(e.target.getAttribute('data-bidx'));
      const tidx = parseInt(e.target.getAttribute('data-tidx'));
      coinbaseChain[bidx].txs[tidx].value = e.target.value;
      await recalculateCoinbaseChain();
      renderCoinbaseChain();
      renderCoinbaseBalances();
    });
  });

  container.querySelectorAll('.cb-tx-from-input').forEach(input => {
    input.addEventListener('input', async (e) => {
      const bidx = parseInt(e.target.getAttribute('data-bidx'));
      const tidx = parseInt(e.target.getAttribute('data-tidx'));
      coinbaseChain[bidx].txs[tidx].from = e.target.value;
      await recalculateCoinbaseChain();
      renderCoinbaseChain();
      renderCoinbaseBalances();
    });
  });

  container.querySelectorAll('.cb-tx-to-input').forEach(input => {
    input.addEventListener('input', async (e) => {
      const bidx = parseInt(e.target.getAttribute('data-bidx'));
      const tidx = parseInt(e.target.getAttribute('data-tidx'));
      coinbaseChain[bidx].txs[tidx].to = e.target.value;
      await recalculateCoinbaseChain();
      renderCoinbaseChain();
      renderCoinbaseBalances();
    });
  });

  container.querySelectorAll('.coinbase-mine-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const idx = parseInt(e.target.getAttribute('data-idx'));
      btn.disabled = true;
      btn.textContent = 'Mining...';

      const diff = difficulty || 2;
      const targetZeros = '0'.repeat(diff);

      let nonce = 0;
      let hash = '';

      let txsString = coinbaseChain[idx].coinbase.value + coinbaseChain[idx].coinbase.to;
      coinbaseChain[idx].txs.forEach(tx => {
        txsString += tx.value + tx.from + tx.to;
      });

      while (nonce < 10000000) {
        const textStr = coinbaseChain[idx].num + nonce + txsString + coinbaseChain[idx].prev;
        hash = await sha256(textStr);
        if (hash.startsWith(targetZeros)) {
          break;
        }
        nonce++;
      }

      coinbaseChain[idx].nonce = nonce;
      await recalculateCoinbaseChain();
      renderCoinbaseChain();
      renderCoinbaseBalances();
    });
  });
}

// Expose update callbacks to window object
window.updateBlockData = updateBlockData;
window.updateBlockNonce = updateBlockNonce;
window.addTransaction = addTransaction;
window.deleteTransaction = deleteTransaction;
window.mineBlock = mineBlock;
window.resetChain = resetChain;
