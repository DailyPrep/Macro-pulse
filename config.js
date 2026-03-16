// API Configuration for ES1! Command Center
// Store your API keys in .env file and load them here

require('dotenv').config();

const config = {
  // Tradier API - Support both TRADIER_KEY and TRADIER_API_KEY
  tradier: {
    apiKey: process.env.TRADIER_KEY || process.env.TRADIER_API_KEY || '',
    baseUrl: process.env.TRADIER_BASE_URL || 'https://api.tradier.com',
    accountId: process.env.TRADIER_ACCOUNT_ID || ''
  },

  // Interactive Brokers (via IB Gateway or TWS API)
  interactiveBrokers: {
    host: process.env.IB_HOST || '127.0.0.1',
    port: process.env.IB_PORT || 7497,
    clientId: process.env.IB_CLIENT_ID || 1
  },

  // TradingView API
  tradingView: {
    apiKey: process.env.TRADING_VIEW_API || process.env.TRADINGVIEW_API_KEY || ''
  },

  // Existing APIs (from workspace rules)
  twelveData: {
    apiKey: process.env.TWELVE_DATA_KEY || process.env.TWELVEDATA_KEY || ''
  },
  fmp: {
    apiKey: process.env.FMP_KEY || process.env.FMP_API_KEY || ''
  },
  eia: {
    apiKey: process.env.EIA_API_KEY || process.env.EIA_KEY || ''
  }
  
  // Note: FinancialJuice uses public RSS feed, no API key needed
};

// Validate API keys on load
function validateConfig() {
  const warnings = [];
  
  if (!config.tradier.apiKey) {
    warnings.push('⚠️  No trading API key found (Tradier) - optional');
  }
  
  if (config.tradier.apiKey) {
    console.log('✅ Tradier API configured');
  }
  if (config.interactiveBrokers.host) {
    console.log('✅ Interactive Brokers configured');
  }
  
  if (warnings.length > 0) {
    console.warn('API Configuration Warnings:');
    warnings.forEach(w => console.warn(w));
  }
}

// Export for Node.js (server-side)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { config, validateConfig };
}

// Export for browser (client-side)
if (typeof window !== 'undefined') {
  window.API_CONFIG = config;
}

