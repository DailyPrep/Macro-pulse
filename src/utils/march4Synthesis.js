/**
 * March 4, 2026 Dashboard Synthesis Layer
 * Filters data to March 4, 2026 and synthesizes live macro intelligence
 */

// Target date: March 4, 2026
export const TARGET_DATE = new Date('2026-03-04T00:00:00Z');
export const TARGET_DATE_END = new Date('2026-03-05T00:00:00Z');

/**
 * Filter items to March 4, 2026 only
 */
export function filterToMarch4(item) {
  if (!item) return false;
  
  const itemDate = new Date(item.pubDate || item.publishedAt || item.timestamp || item.datetime || Date.now());
  return itemDate >= TARGET_DATE && itemDate < TARGET_DATE_END;
}

/**
 * Synthesize Asian/European Session Impacts
 * Detects: PBoC liquidity response, Korean crash, Eurozone energy inflation
 */
export function synthesizeSessionImpacts(newsItems, marketData) {
  const impacts = {
    asia: {
      pbocLiquidity: null,
      koreanCrash: null,
      sessionStatus: 'CLOSED' // Default
    },
    europe: {
      energyInflation: null,
      sessionStatus: 'CLOSED' // Default
    }
  };

  // Filter to March 4, 2026
  const march4News = newsItems.filter(filterToMarch4);

  // Detect PBoC liquidity response
  const pbocKeywords = ['PBoC', 'People\'s Bank of China', 'liquidity', 'injection', 'reverse repo', 'MLF'];
  const pbocItems = march4News.filter(item => {
    const text = (item.title + ' ' + (item.description || '')).toUpperCase();
    return pbocKeywords.some(keyword => text.includes(keyword.toUpperCase()));
  });
  if (pbocItems.length > 0) {
    impacts.asia.pbocLiquidity = {
      detected: true,
      items: pbocItems.slice(0, 3),
      summary: `PBoC liquidity operations detected: ${pbocItems.length} relevant items`
    };
  }

  // Detect Korean crash
  const koreanKeywords = ['Korea', 'KOSPI', 'Seoul', 'Korean', 'crash', 'plunge', 'halt'];
  const koreanItems = march4News.filter(item => {
    const text = (item.title + ' ' + (item.description || '')).toUpperCase();
    return koreanKeywords.some(keyword => text.includes(keyword.toUpperCase()));
  });
  if (koreanItems.length > 0) {
    impacts.asia.koreanCrash = {
      detected: true,
      items: koreanItems.slice(0, 3),
      summary: `Korean market volatility: ${koreanItems.length} relevant items`
    };
  }

  // Detect Eurozone energy inflation
  const eurozoneKeywords = ['Eurozone', 'Europe', 'ECB', 'energy', 'inflation', 'CPI', 'Germany', 'France'];
  const eurozoneItems = march4News.filter(item => {
    const text = (item.title + ' ' + (item.description || '')).toUpperCase();
    return eurozoneKeywords.some(keyword => text.includes(keyword.toUpperCase()));
  });
  if (eurozoneItems.length > 0) {
    impacts.europe.energyInflation = {
      detected: true,
      items: eurozoneItems.slice(0, 3),
      summary: `Eurozone energy-driven inflation: ${eurozoneItems.length} relevant items`
    };
  }

  // Determine session status from market data
  if (marketData) {
    const now = new Date();
    const asiaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }));
    const europeTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/London' }));
    
    // Asia session: 9:00 AM - 3:00 PM Beijing time
    if (asiaTime.getHours() >= 9 && asiaTime.getHours() < 15) {
      impacts.asia.sessionStatus = 'OPEN';
    }
    
    // Europe session: 8:00 AM - 4:30 PM London time
    if (europeTime.getHours() >= 8 && europeTime.getHours() < 16) {
      impacts.europe.sessionStatus = 'OPEN';
    }
  }

  return impacts;
}

/**
 * Synthesize Top 3 Geopolitical Catalysts
 * Detects: Hormuz Escorts, Spain Trade Tensions, Milei's Reforms
 */
export function synthesizeGeopoliticalCatalysts(newsItems) {
  const catalysts = [];

  // Filter to March 4, 2026
  const march4News = newsItems.filter(filterToMarch4);

  // Detect Hormuz Escorts
  const hormuzKeywords = ['Hormuz', 'Strait', 'Iran', 'naval', 'escort', 'shipping', 'oil tanker'];
  const hormuzItems = march4News.filter(item => {
    const text = (item.title + ' ' + (item.description || '')).toUpperCase();
    return hormuzKeywords.some(keyword => text.includes(keyword.toUpperCase()));
  });
  if (hormuzItems.length > 0) {
    catalysts.push({
      rank: 1,
      name: 'Hormuz Escorts',
      description: 'Naval escort operations in Strait of Hormuz affecting oil shipping',
      items: hormuzItems.slice(0, 3),
      impact: 'HIGH',
      color: '#FF0000'
    });
  }

  // Detect Spain Trade Tensions
  const spainKeywords = ['Spain', 'trade', 'tension', 'tariff', 'EU', 'export', 'import'];
  const spainItems = march4News.filter(item => {
    const text = (item.title + ' ' + (item.description || '')).toUpperCase();
    return spainKeywords.some(keyword => text.includes(keyword.toUpperCase()));
  });
  if (spainItems.length > 0) {
    catalysts.push({
      rank: 2,
      name: 'Spain Trade Tensions',
      description: 'Trade tensions affecting European markets',
      items: spainItems.slice(0, 3),
      impact: 'MEDIUM',
      color: '#FF6600'
    });
  }

  // Detect Milei's Reforms (Argentina)
  const mileiKeywords = ['Milei', 'Argentina', 'reform', 'austerity', 'peso', 'Buenos Aires'];
  const mileiItems = march4News.filter(item => {
    const text = (item.title + ' ' + (item.description || '')).toUpperCase();
    return mileiKeywords.some(keyword => text.includes(keyword.toUpperCase()));
  });
  if (mileiItems.length > 0) {
    catalysts.push({
      rank: 3,
      name: 'Milei\'s Reforms',
      description: 'Argentina economic reforms driving LATAM volatility',
      items: mileiItems.slice(0, 3),
      impact: 'MEDIUM',
      color: '#FFD700'
    });
  }

  // If less than 3, add generic geopolitical items
  if (catalysts.length < 3) {
    const geoKeywords = ['geopolitical', 'tension', 'conflict', 'sanction', 'diplomatic'];
    const geoItems = march4News.filter(item => {
      const text = (item.title + ' ' + (item.description || '')).toUpperCase();
      return geoKeywords.some(keyword => text.includes(keyword.toUpperCase()));
    }).slice(0, 3 - catalysts.length);
    
    geoItems.forEach((item, idx) => {
      if (catalysts.length < 3) {
        catalysts.push({
          rank: catalysts.length + 1,
          name: `Geopolitical Event ${catalysts.length + 1}`,
          description: item.title || 'Geopolitical development',
          items: [item],
          impact: 'MEDIUM',
          color: '#FFD700'
        });
      }
    });
  }

  return catalysts.slice(0, 3);
}

/**
 * Calculate Money Supply Expansion/Contraction
 * Factors: Fed emergency buffer, regional strike halts
 */
export function calculateMoneySupply(fredData, newsItems) {
  const march4News = newsItems.filter(filterToMarch4);
  
  let expansion = 0;
  let contraction = 0;
  
  // Base calculation from FRED Net Liquidity
  if (fredData && fredData.netLiquidity) {
    const netLiq = fredData.netLiquidity;
    const prevNetLiq = fredData.previousNetLiquidity || netLiq;
    const change = netLiq - prevNetLiq;
    
    if (change > 0) {
      expansion = change;
    } else {
      contraction = Math.abs(change);
    }
  }

  // Factor in Fed emergency buffer
  const fedKeywords = ['Fed', 'Federal Reserve', 'emergency', 'buffer', 'liquidity facility'];
  const fedItems = march4News.filter(item => {
    const text = (item.title + ' ' + (item.description || '')).toUpperCase();
    return fedKeywords.some(keyword => text.includes(keyword.toUpperCase()));
  });
  if (fedItems.length > 0) {
    // Emergency buffer typically adds liquidity
    expansion += fedItems.length * 10; // Arbitrary multiplier
  }

  // Factor in regional strike halts
  const strikeKeywords = ['strike', 'halt', 'shutdown', 'labor', 'union'];
  const strikeItems = march4News.filter(item => {
    const text = (item.title + ' ' + (item.description || '')).toUpperCase();
    return strikeKeywords.some(keyword => text.includes(keyword.toUpperCase()));
  });
  if (strikeItems.length > 0) {
    // Strikes typically reduce economic activity (contractionary)
    contraction += strikeItems.length * 5; // Arbitrary multiplier
  }

  return {
    expansion: expansion,
    contraction: contraction,
    net: expansion - contraction,
    status: expansion > contraction ? 'EXPANDING' : contraction > expansion ? 'CONTRACTING' : 'NEUTRAL'
  };
}

/**
 * Track Capital Movement
 * Detects: EM/Asian Tech exit → BTC/USD/Defense entry
 */
export function trackCapitalMovement(marketData, newsItems) {
  const march4News = newsItems.filter(filterToMarch4);
  
  const movements = {
    exits: [],
    entries: [],
    netFlow: 'NEUTRAL'
  };

  // Detect EM/Asian Tech exit
  const emTechKeywords = ['emerging market', 'Asian tech', 'China tech', 'sell-off', 'outflow'];
  const emTechItems = march4News.filter(item => {
    const text = (item.title + ' ' + (item.description || '')).toUpperCase();
    return emTechKeywords.some(keyword => text.includes(keyword.toUpperCase()));
  });
  if (emTechItems.length > 0) {
    movements.exits.push({
      asset: 'EM/Asian Tech',
      strength: emTechItems.length,
      items: emTechItems.slice(0, 3)
    });
  }

  // Detect BTC entry
  const btcKeywords = ['Bitcoin', 'BTC', 'crypto', 'cryptocurrency', 'inflow'];
  const btcItems = march4News.filter(item => {
    const text = (item.title + ' ' + (item.description || '')).toUpperCase();
    return btcKeywords.some(keyword => text.includes(keyword.toUpperCase()));
  });
  if (btcItems.length > 0) {
    movements.entries.push({
      asset: 'BTC',
      strength: btcItems.length,
      items: btcItems.slice(0, 3)
    });
  }

  // Detect USD entry
  const usdKeywords = ['dollar', 'USD', 'safe haven', 'flight to quality'];
  const usdItems = march4News.filter(item => {
    const text = (item.title + ' ' + (item.description || '')).toUpperCase();
    return usdKeywords.some(keyword => text.includes(keyword.toUpperCase()));
  });
  if (usdItems.length > 0) {
    movements.entries.push({
      asset: 'USD',
      strength: usdItems.length,
      items: usdItems.slice(0, 3)
    });
  }

  // Detect Defense entry
  const defenseKeywords = ['defense', 'military', 'aerospace', 'Lockheed', 'Raytheon', 'Northrop'];
  const defenseItems = march4News.filter(item => {
    const text = (item.title + ' ' + (item.description || '')).toUpperCase();
    return defenseKeywords.some(keyword => text.includes(keyword.toUpperCase()));
  });
  if (defenseItems.length > 0) {
    movements.entries.push({
      asset: 'Defense',
      strength: defenseItems.length,
      items: defenseItems.slice(0, 3)
    });
  }

  // Determine net flow
  const totalExits = movements.exits.reduce((sum, e) => sum + e.strength, 0);
  const totalEntries = movements.entries.reduce((sum, e) => sum + e.strength, 0);
  
  if (totalEntries > totalExits) {
    movements.netFlow = 'RISK-OFF (Flight to Safety)';
  } else if (totalExits > totalEntries) {
    movements.netFlow = 'RISK-ON (Capital Rotation)';
  }

  return movements;
}

