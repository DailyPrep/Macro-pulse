// ES1! Command Center - Main Server
// Macro Pulse Configuration: 27 accounts across 4 active panels

// Suppress Node.js deprecation warnings from rss-parser (uses url.parse internally)
// This is a known issue with rss-parser library - we suppress it to reduce noise
process.on('warning', (warning) => {
  // Suppress url.parse() deprecation warnings from rss-parser
  if (warning.name === 'DeprecationWarning' && 
      warning.message && warning.message.includes('url.parse()')) {
    return; // Suppress this specific warning
  }
  // Log other warnings normally (optional - comment out to suppress all warnings)
  // console.warn(warning.name, warning.message);
});

require('dotenv').config();
const express = require('express');
const http = require('http');
const https = require('https');
const axios = require('axios');
const cheerio = require('cheerio');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const RSSParser = require('rss-parser');
const { config } = require('./config');

// Nitter instances - exact list
const NITTER_INSTANCES = [
  'https://nitter.net',
  'https://nitter.tiekoetter.com',
  'https://nitter.cz'
];

// Fallback instance - hardcoded working instance
const FALLBACK_INSTANCES = ['https://nitter.tiekoetter.com'];

// HTTPS agent for all Nitter requests
const nitterAgent = new https.Agent({ rejectUnauthorized: false });
const TWITTER_ACCOUNTS = require('./config/twitterAccounts');
const { scoreImportance } = require('./utils/scoreImportance');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'build')));
app.use(express.static(__dirname));

// Initialize RSS Parser with better error handling
const rssParser = new RSSParser({
  customFields: {
    item: ['description', 'pubDate', 'link', 'content:encoded', 'content']
  },
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
  },
  timeout: 15000,
  maxRedirects: 3,
  requestOptions: {
    timeout: 15000,
    rejectUnauthorized: false,
    httpsAgent: nitterAgent
  }
});

// Helper function to format Nitter errors
function formatNitterError(account, err) {
  if (err.message && err.message.includes('Timeout')) {
    return `   ⚠️  @${account}: Timeout (feed took too long)`;
  }
  if (err.message && (err.message.includes('502') || err.message.includes('Status code 502'))) {
    return `   ⚠️  @${account}: Server error (502)`;
  }
  if (err.message && (err.message.includes('400') || err.message.includes('Status code 400'))) {
    return `   ⚠️  @${account}: Bad request (400) - instance may be blocking`;
  }
  if (err.message && (err.message.includes('403') || err.message.includes('Status code 403'))) {
    return `   ⚠️  @${account}: Access denied (403)`;
  }
  if (err.message && err.message.includes('ECONNREFUSED')) {
    return `   ⚠️  @${account}: Connection refused`;
  }
  if (err.message && (err.message.includes('ENOENT') || err.message.includes('ENOTFOUND') || err.message.includes('getaddrinfo'))) {
    return `   ⚠️  @${account}: DNS lookup failed (instance may be down)`;
  }
  if (err.message && (err.message.includes('Invalid RSS') || err.message.includes('Feed not recognized'))) {
    return `   ⚠️  @${account}: Invalid RSS feed format`;
  }
  if (err.message && (err.message.includes('Invalid character') || err.message.includes('entity name'))) {
    return `   ⚠️  @${account}: Malformed XML/RSS`;
  }
  if (err.message && err.message.includes('Connection failed')) {
    return `   ⚠️  @${account}: Connection failed`;
  }
  // Suppress verbose XML/RSS parsing errors
  if (err.message && (err.message.includes('XML') || err.message.includes('RSS') || err.message.includes('Line:'))) {
    return `   ⚠️  @${account}: RSS parsing error`;
  }
  return `   ⚠️  @${account}: ${err.message || 'Unknown error'}`;
}

// Track working Nitter instances (filtered from health check)
// Will be updated by health check to only include instances that return HTTP 200
let workingNitterInstances = [...NITTER_INSTANCES]; // Default to all, will be filtered by health check

// Shared config for other modules
const { setWorkingInstances } = require('./config/workingNitterInstances');

// MACRO PULSE — Nitter/Twitter only
// CONFIRMED WORKING ACCOUNTS - 27 accounts across 4 active panels
const PANEL_ACCOUNTS = {
  politics: ['POTUS', 'SecWar', 'Austan_Goolsbee', 'stlouisfed', 'elerianm', 'MacroAlf'],
  ib: ['dealertAI', 'CitronResearch', 'davidein', 'DougKass'],
  physical: ['JavierBlas', 'GoldmanSachs', 'PIMCO', 'kitjuckes', 'mark_dow', 'lisaabramowicz1', '0xzxcom'],
  squawk: ['financialjuice', 'NickTimiraos', 'RiskReversal', 'ritholtz', 'conorsen', 'SpotGamma', 'unusual_whales', 'MacroAlf', 'zerohedge', 'markets'],
  commodity: [],
  gamma: []
  // NOTE: Regional accounts (asia, europe, mena, latam) removed - Global Flow now uses news URLs only
};

// GLOBAL FLOW — News article URLs only
// News site URLs for each region (scraped directly, no APIs/Twitter/Nitter)
const NEWS_SITE_URLS = {
  asia: [
    { url: 'https://www.scmp.com/news/asia', source: 'SCMP' },
    { url: 'https://www.channelnewsasia.com/asia', source: 'CNA' },
    { url: 'https://asia.nikkei.com/', source: 'Nikkei Asia' },
    { url: 'https://apnews.com/hub/asia-pacific', source: 'AP Asia' },
    { url: 'https://www.rfa.org/english', source: 'Radio Free Asia' }
  ],
  europe: [
    { url: 'https://feeds.bbci.co.uk/news/world/europe/rss.xml', source: 'BBC Europe' },
    { url: 'https://apnews.com/hub/europe', source: 'AP Europe' },
    { url: 'https://www.politico.eu/', source: 'Politico Europe' },
    { url: 'https://www.dw.com/en/top-stories/s-9097', source: 'DW News' },
    { url: 'https://www.euronews.com/news/europe', source: 'Euronews' },
    { url: 'https://www.euractiv.com', source: 'Euractiv' }
  ],
  mena: [
    { url: 'https://www.aljazeera.com/middle-east/', source: 'Al Jazeera' },
    { url: 'https://www.aljazeera.com/where/middle-east/', source: 'Al Jazeera MENA' },
    { url: 'https://www.thenationalnews.com/world/mena/', source: 'The National' },
    { url: 'https://apnews.com/hub/middle-east', source: 'AP Middle East' }
  ],
  latam: [
    { url: 'https://mercopress.com/', source: 'Mercopress' },
    { url: 'https://www.batimes.com.ar/', source: 'Buenos Aires Times' },
    { url: 'https://riotimesonline.com/', source: 'Rio Times' },
    { url: 'https://apnews.com/hub/latin-america', source: 'AP Latin America' },
    { url: 'https://www.telesurtv.net/english/news/', source: 'Telesur' }
  ]
};

// GLOBAL FLOW — News article scraper — used by regional scope endpoints only
async function scrapeNewsArticles(urls) {
  const results = [];
  for (const { url, source } of urls) {
    try {
      const res = await axios.get(url, {
        timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; newsbot/1.0)' }
      });
      const $ = cheerio.load(res.data);
      
      // Al Jazeera-specific selector to avoid grabbing article body text
      let selector;
      if (source === 'Al Jazeera') {
        selector = 'article h3 a, .article-card__title a, .u-clickable-card__link';
      } else {
        // Common news site patterns for other sites
        selector = 'article, .story, .card, h3 a, h2 a, .headline a';
      }
      
      // Extract article links and headlines
      $(selector).each((i, el) => {
        let title = $(el).text().trim() || $(el).find('h2,h3,h4').first().text().trim();
        const href = $(el).is('a') ? $(el).attr('href') : $(el).find('a').first().attr('href');
        
        if (!title || !href) return;
        
        // Fix Al Jazeera: strip "Published" text and any following content
        if (source === 'Al Jazeera') {
          title = title.replace(/Published.*$/i, '').trim();
        }
        
        // Skip if title is too short after cleaning
        if (title.length < 15) return;
        
        const articleUrl = href.startsWith('http') ? href : new URL(href, url).href;
        const timestamp = new Date().toISOString();
        results.push({
          title,
          url: articleUrl,
          source,
          timestamp: timestamp,
          datetime: timestamp,
          pubDate: timestamp,
          description: '',
          label: source
        });
      });
    } catch (err) {
      console.error(`❌ Failed to scrape ${url}: ${err.message}`);
    }
  }
  // Deduplicate by URL
  const seen = new Set();
  return results.filter(r => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });
}

// Main fetchTwitterFeeds function
async function fetchTwitterFeeds(category) {
  // Use panel accounts from PANEL_ACCOUNTS
  const accounts = PANEL_ACCOUNTS[category] || [];
  if (accounts.length === 0) {
    console.log(`⚠️  No Twitter accounts configured for category: ${category}`);
    return [];
  }

  console.log(`🐦 [${category.toUpperCase()}] Fetching Twitter feeds from ${accounts.length} accounts...`);
  const twitterItems = [];

  // Fetch feeds from multiple accounts sequentially to avoid overwhelming instances
  // Allow all accounts for all categories (staggered intervals handle rate limiting)
  const accountLimit = accounts.length;

  // Try each account on multiple instances until one works (per-account retry)
  let workingInstance = null;
  const feedPromises = accounts.slice(0, accountLimit).map(async (account, accountIndex) => {
    let lastAccountError = null; // Track last error for this account
    // Add delay between accounts to avoid overwhelming Nitter instances
    if (accountIndex > 0) {
      await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay between accounts
    }
    
    // Try each working Nitter instance for this specific account (retry logic)
    // Only use instances that passed health check (HTTP 200)
    // nitterBase is properly scoped within this loop - NO STRAY CONSOLE.LOG
    const instancesToTry = workingNitterInstances.length > 0 ? workingNitterInstances : NITTER_INSTANCES;
    for (const nitterBase of instancesToTry) {
      try {
        // Strip @ symbol from account name if present
        const cleanAccount = account.replace(/^@/, '');
        const rssUrl = `${nitterBase}/${cleanAccount}/rss?count=100`;
        // Only log first instance attempt to reduce noise
        if (NITTER_INSTANCES.indexOf(nitterBase) === 0) {
          console.log(`   📡 Fetching @${account}...`);
        }

        // Add delay between instance attempts to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay

        // Parse RSS feed - let the parser handle its own timeout
        // Wrap in try-catch to handle RSS parsing errors gracefully
        let feed;
        try {
          feed = await rssParser.parseURL(rssUrl);
        } catch (parseError) {
          // If it's a parsing error (XML/RSS malformed), throw it to be caught by outer catch
          // This allows us to try the next instance
          if (parseError.message && (
            parseError.message.includes('XML') ||
            parseError.message.includes('RSS') ||
            parseError.message.includes('Invalid') ||
            parseError.message.includes('entity') ||
            parseError.message.includes('Line:') ||
            parseError.message.includes('parse')
          )) {
            throw new Error('RSS parsing error');
          }
          throw parseError;
        }

        // Always process feed if it exists (even if empty)
        if (feed) {
          // Track working instance
          if (!workingInstance) {
            workingInstance = nitterBase;
          }
          
          // Filter out only error messages and invalid items (no time-based filtering)
          const filteredItems = (feed.items || [])
            .filter(item => {
              // Filter out whitelist error messages from Nitter instances FIRST
              const title = (item.title || '').toLowerCase();
              const description = (item.description || item.contentSnippet || '').toLowerCase();
              const content = (item.content || '').toLowerCase();
              
              // More aggressive whitelist detection
              if (title.includes('rss reader not yet whitelisted') || 
                  description.includes('rss reader not yet whitelisted') ||
                  title.includes('rss reader not yet whitelist') ||
                  content.includes('rss reader not yet whitelisted') ||
                  (title.includes('whitelist') && (description.includes('rss') || content.includes('rss'))) ||
                  title.includes('please whitelist') ||
                  description.includes('please whitelist')) {
                console.log(`   ⚠️  @${account}: Skipping whitelist error message from ${nitterBase}`);
                return false;
              }
              
              // Skip items that are clearly error messages or empty
              if (!title || title.length < 10 || (!description && !item.contentSnippet)) {
                return false; // Skip very short items or items without content (likely errors)
              }
              
              // Skip items that look like error pages
              if (title.includes('error') || title.includes('not found') || title.includes('404') || 
                  title.includes('403') || title.includes('forbidden') || title.includes('access denied')) {
                return false;
              }
              
              // No time-based filtering - return all valid items
              return true;
            })
            .map(item => {
              // Parse date properly for sorting (no filtering by date)
              let itemDate = new Date(); // Default to now if no valid date
              const dateFields = [item.pubDate, item.isoDate, item.date, item.created];
              
              for (const dateField of dateFields) {
                if (!dateField) continue;
                const parsed = new Date(dateField);
                if (!isNaN(parsed.getTime())) {
                  // Accept any valid date (no time-based filtering)
                  itemDate = parsed;
                  break;
                }
              }
              
              const tweetItem = {
                title: item.title || item.contentSnippet || '', // Add title field for compatibility
                headline: item.title || item.contentSnippet || '',
                summary: item.contentSnippet || item.title || '',
                source: account === '0xzxcom' ? 'Twitter' : `Twitter: @${account}`,
                account: account, // Add account field for frontend filtering
                link: item.link || `https://twitter.com/${account}`, // Add link field for compatibility
                url: item.link || `https://twitter.com/${account}`,
                datetime: itemDate.toISOString(),
                timestamp: itemDate.toISOString(), // Add timestamp for sorting
                pubDate: itemDate.toISOString(), // Add pubDate for compatibility
                category: category
              };
              // Score importance
              const importance = scoreImportance(tweetItem, category);
              tweetItem.importance = importance;
              return tweetItem;
            });

          // Log success with item count (even if 0 after filtering)
          const totalItems = feed.items ? feed.items.length : 0;
          if (filteredItems.length > 0) {
            // Enhanced logging for squawk category
            if (category === 'squawk') {
              console.log(`[SQUAWK] ${account}: SUCCESS (${filteredItems.length} items)`);
            } else {
              console.log(`   ✅ @${account}: ${filteredItems.length} tweets found (${totalItems} total in feed)`);
            }
            return filteredItems;
          } else if (totalItems > 0) {
            // If we have items but they were all filtered, log why for debugging
            const sampleItem = feed.items[0];
            let sampleDate = null;
            const dateFields = [sampleItem.pubDate, sampleItem.isoDate, sampleItem.date, sampleItem.created];
            
            for (const dateField of dateFields) {
              if (!dateField) continue;
              const parsed = new Date(dateField);
              if (!isNaN(parsed.getTime())) {
                const daysDiff = Math.abs((Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24));
                if (daysDiff < 1825) { // Only use reasonable dates
                  sampleDate = parsed;
                  break;
                }
              }
            }
            
            const daysAgo = sampleDate ? 
              Math.floor((Date.now() - sampleDate.getTime()) / (1000 * 60 * 60 * 24)) + ' days ago' :
              'invalid/unreasonable date';
            if (category === 'squawk') {
              console.log(`[SQUAWK] ${account}: FAILED (all ${totalItems} items filtered - sample: ${daysAgo})`);
            } else {
              console.log(`   ⚠️  @${account}: Feed fetched (${totalItems} items, all filtered - sample: ${daysAgo})`);
            }
            return [];
          } else {
            if (category === 'squawk') {
              console.log(`[SQUAWK] ${account}: FAILED (empty feed)`);
            } else {
              console.log(`   ✅ @${account}: Feed fetched (empty feed)`);
            }
            return [];
          }
        } else {
          console.log(`   ⚠️  @${account}: No items in feed`);
          return [];
        }
      } catch (err) {
        // Check for retryable errors (502, 403, 400, ECONNREFUSED, DNS errors, RSS parsing errors) - these should trigger instance switch
        const isRetryableError = err.message && (
          err.message.includes('502') ||
          err.message.includes('Status code 502') ||
          err.message.includes('400') ||
          err.message.includes('Status code 400') ||
          err.message.includes('403') ||
          err.message.includes('Status code 403') ||
          err.message.includes('ECONNREFUSED') ||
          err.message.includes('ECONNRESET') ||
          err.message.includes('ENOENT') ||
          err.message.includes('ENOTFOUND') ||
          err.message.includes('getaddrinfo') ||
          err.message.includes('Invalid character') ||
          err.message.includes('Feed not recognized') ||
          err.message.includes('entity name') ||
          err.message.includes('Invalid RSS') ||
          err.message.includes('RSS parsing error') ||
          err.message.includes('XML') ||
          err.message.includes('RSS') ||
          err.message.includes('parse') ||
          err.message.includes('Timeout')
        );
        
        // Store the error for logging if all instances fail
        lastAccountError = err;
        
        if (isRetryableError) {
          // Try next instance silently (don't log every retry to reduce noise)
          // Only log if it's the last instance and we're about to give up
          const isLastInstance = NITTER_INSTANCES.indexOf(nitterBase) === NITTER_INSTANCES.length - 1;
          if (isLastInstance) {
            // This is the last instance, log the error
            console.log(formatNitterError(account, err));
          }
          continue; // Try next instance
        }
        
        // Log non-retryable errors (but suppress RSS parsing errors to reduce noise)
        if (!err.message.includes('RSS parsing error') && !err.message.includes('XML') && !err.message.includes('RSS')) {
          console.log(formatNitterError(account, err));
        }
        continue; // Try next instance for this account
      }
    }
    
    // If we get here, all instances failed for this account
    const errorMsg = lastAccountError ? (lastAccountError.message || lastAccountError.toString()) : 'All instances exhausted';
    
    // Enhanced error logging for squawk category with specific failure reasons
    if (category === 'squawk') {
      let failureReason = 'Unknown error';
      if (lastAccountError) {
        const errMsg = lastAccountError.message || lastAccountError.toString();
        if (errMsg.includes('502') || errMsg.includes('Status code 502')) {
          failureReason = 'Rate limit / Server error (502)';
        } else if (errMsg.includes('403') || errMsg.includes('Status code 403')) {
          failureReason = 'Forbidden / Access denied (403)';
        } else if (errMsg.includes('404') || errMsg.includes('Status code 404')) {
          failureReason = 'Account not found (404)';
        } else if (errMsg.includes('Timeout') || errMsg.includes('ETIMEDOUT')) {
          failureReason = 'Request timeout';
        } else if (errMsg.includes('ECONNREFUSED') || errMsg.includes('ECONNRESET')) {
          failureReason = 'Connection refused / reset';
        } else if (errMsg.includes('ENOTFOUND') || errMsg.includes('getaddrinfo')) {
          failureReason = 'DNS resolution failed';
        } else {
          failureReason = errMsg.substring(0, 100); // Truncate long errors
        }
      }
      console.log(`[SQUAWK] ${account}: FAILED (${failureReason})`);
    } else {
      console.log(`❌ @${account}: All Nitter instances failed - ${errorMsg}`);
    }
    return [];
  });

  // Wait for all account fetches to complete
  const results = await Promise.allSettled(feedPromises);
  let successCount = 0;
  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && Array.isArray(result.value)) {
      twitterItems.push(...result.value);
      if (result.value.length > 0) successCount++;
    }
  });

  // Enhanced logging for squawk category
  if (category === 'squawk') {
    console.log(`[SQUAWK] Total: ${successCount}/${accounts.slice(0, accountLimit).length} accounts returned data`);
  } else {
    console.log(`   📊 Results: ${successCount}/${accounts.slice(0, accountLimit).length} accounts checked, ${twitterItems.length} total tweets`);
  }
  
  if (workingInstance) {
    console.log(`✅ Working Nitter instance: ${workingInstance}`);
  }

  // Sort by datetime (newest first) - for commodity, prioritize today over yesterday
  twitterItems.sort((a, b) => {
    // For commodity, prioritize today's tweets
    if (category === 'commodity') {
      if (a._isToday && !b._isToday) return -1;
      if (!a._isToday && b._isToday) return 1;
    }
    // For IB, prioritize today's tweets (all should be today, but just in case)
    if (category === 'ib') {
      if (a._isToday && !b._isToday) return -1;
      if (!a._isToday && b._isToday) return 1;
    }
    // Then sort by datetime (newest first)
    const dateA = new Date(a.datetime || 0);
    const dateB = new Date(b.datetime || 0);
    return dateB - dateA;
  });

  // Fair distribution for squawk category - ensure all accounts are represented
  let finalItems;
  if (category === 'squawk') {
    // Group items by account to ensure fair distribution
    const byAccount = {};
    twitterItems.forEach(item => {
      const account = item.account || 'unknown';
      if (!byAccount[account]) {
        byAccount[account] = [];
      }
      byAccount[account].push(item);
    });
    
    // Sort all items by date (newest first) - no limits
    const fairItems = Object.values(byAccount)
      .flatMap(items => {
        // Sort each account's items by date (newest first) - return all items
        return items.sort((a, b) => {
          const dateA = new Date(a.datetime || a.timestamp || a.pubDate || 0).getTime();
          const dateB = new Date(b.datetime || b.timestamp || b.pubDate || 0).getTime();
          return dateB - dateA;
        });
      })
      .sort((a, b) => {
        // Sort all items by date (newest first)
        const dateA = new Date(a.datetime || a.timestamp || a.pubDate || 0).getTime();
        const dateB = new Date(b.datetime || b.timestamp || b.pubDate || 0).getTime();
        return dateB - dateA;
      });
    
    finalItems = fairItems;
  } else {
    // For other categories, sort by date (newest first) - no limits
    finalItems = twitterItems.sort((a, b) => {
      const dateA = new Date(a.datetime || a.timestamp || a.pubDate || 0).getTime();
      const dateB = new Date(b.datetime || b.timestamp || b.pubDate || 0).getTime();
      return dateB - dateA;
    });
  }
  
  if (finalItems.length === 0) {
    console.log(`⚠️  No Twitter feeds retrieved for ${category} after trying all Nitter instances`);
  } else {
    if (category === 'squawk') {
      const accountCount = new Set(finalItems.map(item => item.account || 'unknown')).size;
      console.log(`✅ Returning ${finalItems.length} Twitter items for ${category} (${accountCount} accounts represented)`);
    } else {
      console.log(`✅ Returning ${finalItems.length} Twitter items for ${category}`);
    }
  }

  // For squawk category, return metadata about active sources
  if (category === 'squawk') {
    return {
      items: finalItems,
      meta: {
        activeSources: successCount,
        totalSources: accounts.length
      }
    };
  }

  return finalItems;
}

// 4-Panel Macro Pulse Feed Buffers
let politicsFeedBuffer = [];
let commodityFeedBuffer = [];
let ibFeedBuffer = [];
let physicalFeedBuffer = []; // Physical Pipeline Flow
let squawkFeedBuffer = [];

// Cache for Macro Pulse feeds
const newsCache = {
  politics: null,
  commodity: null,
  ib: null,
  physical: null,
  squawk: null
};

// API Endpoint: Get Macro Feed by Category (4-Panel Structure)
app.get('/api/macro-feed/:category', async (req, res) => {
  const { category } = req.params;
  
  if (!['politics', 'commodity', 'ib', 'physical', 'squawk', 'gamma'].includes(category)) {
    return res.status(400).json({ status: 'error', message: 'Invalid category' });
  }

  try {
    // Return cached data if available
    const cacheKey = category;
    if (newsCache[cacheKey]) {
      // Handle metadata structure for squawk category
      if (category === 'squawk' && newsCache[cacheKey] && typeof newsCache[cacheKey] === 'object' && newsCache[cacheKey].items) {
        return res.json({
          status: 'success',
          data: newsCache[cacheKey].items,
          meta: newsCache[cacheKey].meta,
          timestamp: new Date().toISOString(),
          cached: true
        });
      } else {
        return res.json({
          status: 'success',
          data: newsCache[cacheKey],
          timestamp: new Date().toISOString(),
          cached: true
        });
      }
    }

    // Fetch fresh data
    const feeds = await fetchTwitterFeeds(category);
    newsCache[cacheKey] = feeds;

    // Handle metadata structure for squawk category
    if (category === 'squawk' && feeds && typeof feeds === 'object' && feeds.items) {
      res.json({
        status: 'success',
        data: feeds.items,
        meta: feeds.meta,
        timestamp: new Date().toISOString(),
        cached: false
      });
    } else {
      res.json({
        status: 'success',
        data: feeds,
        timestamp: new Date().toISOString(),
        cached: false
      });
    }
  } catch (error) {
    console.error(`❌ Error fetching ${category} feed:`, error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// 0x News RSS Feed Endpoint
app.get('/api/macro-feed/0xnews', async (req, res) => {
  try {
    const rssUrl = 'https://nitter.poast.org/0xzxcom/rss?count=100';
    console.log('📡 Fetching 0x News RSS from:', rssUrl);
    const feed = await rssParser.parseURL(rssUrl);
    
    const items = (feed.items || [])
      .map(item => ({
        id: item.guid || item.link || Math.random().toString(36),
        title: item.title || '',
        description: item.contentSnippet || item.content || '',
        url: item.link || '#',
        timestamp: item.pubDate || item.isoDate || new Date().toISOString(),
        datetime: item.pubDate || item.isoDate || new Date().toISOString(),
        pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
        source: '0x News',
        account: '0xzxcom'
      }))
      .sort((a, b) => {
        // Sort by timestamp descending (newest first)
        const dateA = new Date(a.timestamp || a.datetime || a.pubDate || 0).getTime();
        const dateB = new Date(b.timestamp || b.datetime || b.pubDate || 0).getTime();
        return dateB - dateA;
      });
    
    console.log(`✅ 0x News RSS: Fetched ${items.length} items`);
    res.json({
      status: 'success',
      data: items,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error fetching 0x News RSS:', error.message);
    res.status(500).json({
      status: 'error',
      message: error.message,
      data: []
    });
  }
});

// Economic Calendar RSS Feed Endpoint
app.get('/api/macro-feed/calendar', async (req, res) => {
  try {
    const calendarSources = [
      { url: 'https://nitter.poast.org/EconomicCalendar/rss?count=100', account: 'EconomicCalendar', source: 'Twitter' },
      { url: 'https://nitter.poast.org/forexfactory/rss?count=100', account: 'forexfactory', source: 'Twitter' },
      { url: 'https://nitter.poast.org/marketwatch/rss?count=100', account: 'marketwatch', source: 'Twitter' },
      { url: 'https://nitter.poast.org/federalreserve/rss?count=100', account: 'federalreserve', source: 'Twitter' }
    ];

    console.log('📅 Fetching Economic Calendar RSS feeds...');
    const allItems = [];

    for (const source of calendarSources) {
      try {
        const feed = await rssParser.parseURL(source.url);
        const items = (feed.items || []).map(item => ({
          id: item.guid || item.link || `${source.account}-${Math.random().toString(36)}`,
          title: item.title || '',
          description: item.contentSnippet || item.content || '',
          url: item.link || '#',
          timestamp: item.pubDate || item.isoDate || new Date().toISOString(),
          datetime: item.pubDate || item.isoDate || new Date().toISOString(),
          pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
          source: source.source,
          account: source.account
        }));
        allItems.push(...items);
        console.log(`   ✅ ${source.account}: ${items.length} items`);
      } catch (error) {
        console.error(`   ❌ Error fetching ${source.account}:`, error.message);
      }
    }

    // Sort by timestamp ascending (upcoming events first)
    const sortedItems = allItems.sort((a, b) => {
      const dateA = new Date(a.timestamp || a.datetime || a.pubDate || 0).getTime();
      const dateB = new Date(b.timestamp || b.datetime || b.pubDate || 0).getTime();
      return dateA - dateB;
    });

    console.log(`✅ Economic Calendar: Fetched ${sortedItems.length} total items`);
    res.json({
      status: 'success',
      data: sortedItems,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error fetching Economic Calendar RSS:', error.message);
    res.status(500).json({
      status: 'error',
      message: error.message,
      data: []
    });
  }
});

// Clear cache endpoint
app.post('/api/macro-feed/clear-cache', (req, res) => {
  const { category } = req.body;
  if (category && ['politics', 'commodity', 'ib', 'physical', 'squawk'].includes(category)) {
    newsCache[category] = null;
    console.log(`🗑️  Cleared cache for category: ${category}`);
    res.json({ status: 'success', message: `Cache cleared for ${category}` });
  } else {
    // Clear all caches
    Object.keys(newsCache).forEach(key => delete newsCache[key]);
    console.log(`🗑️  Cleared all macro feed caches`);
    res.json({ status: 'success', message: 'All caches cleared' });
  }
});

// Regional data cache for Global Flow tab
const regionalCache = {
  asia: null,
  europe: null,
  mena: null,
  latam: null
};

// Hardcoded March 12, 2026 events for Global Flow (Macro Pulse style articles)
function getHardcodedMarch12Events(region) {
  const events = [];
  const march12Date = new Date('2026-03-12T12:00:00Z').toISOString();
  
  // CRITICAL (RED) - Straits of Hormuz Closure (MENA region)
  if (region === 'mena') {
    events.push({
      title: 'Straits of Hormuz Closure - Oil surges 30%+, US/Israel military operations against Iran confirmed.',
      url: '#',
      source: 'Strategic Intelligence',
      timestamp: march12Date,
      datetime: march12Date,
      pubDate: march12Date,
      level: 'CRITICAL',
      account: 'SYSTEM',
      description: 'Critical geopolitical event: Hormuz closure triggers massive oil price surge. US/Israel military operations confirmed against Iran.',
      conflictFlow: true,
      commodityShift: true,
      tariffSignal: false
    });
  }
  
  // ASIA SCOPE - Only 2 articles for Asian scope
  if (region === 'asia') {
    // Article 1: STRATEGIC (YELLOW) - Supreme Court invalidates Trump tariffs
    events.push({
      title: 'Supreme Court invalidates Trump tariffs - Market pricing in legal volatility; DXY showing massive swings.',
      url: '#',
      source: 'Legal & Market Intelligence',
      timestamp: march12Date,
      datetime: march12Date,
      pubDate: march12Date,
      level: 'IMPORTANT', // STRATEGIC maps to IMPORTANT (yellow)
      account: 'SYSTEM',
      description: 'Supreme Court ruling invalidates Trump-era tariffs. Markets pricing in legal volatility. DXY experiencing massive swings.',
      conflictFlow: false,
      commodityShift: false,
      tariffSignal: true
    });
    
    // Article 2: Add second article for Asia (you can customize this)
    events.push({
      title: 'Asian Markets React to Tariff Ruling - HSI and Nikkei showing volatility as DXY swings.',
      url: '#',
      source: 'Market Intelligence',
      timestamp: march12Date,
      datetime: march12Date,
      pubDate: march12Date,
      level: 'STANDARD',
      account: 'SYSTEM',
      description: 'Asian markets reacting to Supreme Court tariff invalidation. Hang Seng and Nikkei showing increased volatility.',
      conflictFlow: false,
      commodityShift: false,
      tariffSignal: true
    });
    
    // Return only these 2 articles for Asia
    return events;
  }
  
  // STRATEGIC (YELLOW) - Supreme Court invalidates Trump tariffs (Europe region)
  if (region === 'europe') {
    events.push({
      title: 'Supreme Court invalidates Trump tariffs - Market pricing in legal volatility; DXY showing massive swings.',
      url: '#',
      source: 'Legal & Market Intelligence',
      timestamp: march12Date,
      datetime: march12Date,
      pubDate: march12Date,
      level: 'IMPORTANT', // STRATEGIC maps to IMPORTANT (yellow)
      account: 'SYSTEM',
      description: 'Supreme Court ruling invalidates Trump-era tariffs. Markets pricing in legal volatility. DXY experiencing massive swings.',
      conflictFlow: false,
      commodityShift: false,
      tariffSignal: true
    });
  }
  
  // LIQUIDITY (ORANGE) - Private Credit Jitters (All regions, but most relevant to Europe/US)
  if (region === 'europe' || region === 'latam') {
    events.push({
      title: 'Private Credit Jitters - $1.4B asset sale triggered to meet redemptions; monitor for \'cockroach\' contagion.',
      url: '#',
      source: 'Credit Market Intelligence',
      timestamp: march12Date,
      datetime: march12Date,
      pubDate: march12Date,
      level: 'IMPORTANT', // LIQUIDITY maps to IMPORTANT (orange/yellow)
      account: 'SYSTEM',
      description: 'Private credit sector showing stress. $1.4B asset sale triggered to meet redemptions. Monitor for potential contagion effects.',
      conflictFlow: false,
      commodityShift: false,
      tariffSignal: false
    });
  }
  
  // SECTOR (WHITE) - German Industrial Revival (Europe region)
  if (region === 'europe') {
    events.push({
      title: 'German Industrial Revival - DAX showing strength vs US Software Index (Software down 30% from Oct peak).',
      url: '#',
      source: 'Sector Analysis',
      timestamp: march12Date,
      datetime: march12Date,
      pubDate: march12Date,
      level: 'STANDARD', // SECTOR maps to STANDARD (white)
      account: 'SYSTEM',
      description: 'German industrial sector showing strength. DAX outperforming while US Software Index down 30% from October peak.',
      conflictFlow: false,
      commodityShift: false,
      tariffSignal: false
    });
  }
  
  return events;
}

// Helper function to detect conflict flows (cross-regional relationships)
function detectConflictFlow(item, allRegionalData) {
  const title = ((item.title || item.headline || '') + '').toLowerCase();
  const description = ((item.description || item.contentSnippet || '') + '').toLowerCase();
  const combined = title + ' ' + description;
  
  // MENA → Asia conflict flow patterns (Hormuz bottleneck affecting Asian logistics)
  const conflictPatterns = [
    // Dubai/UAE flight suspensions affecting China/Asia
    /\b(air china|china eastern|dubai|uae|emirates)\b.*\b(suspend|suspended|halt|halted|cancel|cancelled|flight)\b/i,
    // Hormuz bottleneck affecting Asian supply chains
    /\b(hormuz|strait|blockade|shipping|logistics)\b.*\b(china|asia|asian|hong kong|shanghai|japan)\b/i,
    // Energy disruptions affecting Asian markets
    /\b(brent|crude|oil|energy)\b.*\b(disruption|shortage|supply|china|asia)\b/i
  ];
  
  return conflictPatterns.some(pattern => pattern.test(combined));
}

// Helper function to detect commodity shifts (Energy, Aluminum, Zijin/CNOOC)
function detectCommodityShift(item) {
  const title = ((item.title || item.headline || '') + '').toLowerCase();
  const description = ((item.description || item.contentSnippet || '') + '').toLowerCase();
  const combined = title + ' ' + description;
  
  const commodityPatterns = [
    // Energy surge
    /\b(energy|crude|oil|brent|wti)\b.*\b(surge|spike|jump|rally|\+[2-9]%)\b/i,
    // Aluminum surge
    /\b(aluminum|aluminium|alu)\b.*\b(surge|spike|jump|rally|\+[2-9]%)\b/i,
    // Zijin Mining activity
    /\b(zijin|zijin mining|2899\.hk)\b.*\b(surge|spike|jump|rally|deal|acquisition|>3b|billion)\b/i,
    // CNOOC activity
    /\b(cnooc|883\.hk|china national offshore)\b.*\b(surge|spike|jump|rally|deal|>3b|billion)\b/i
  ];
  
  return commodityPatterns.some(pattern => pattern.test(combined));
}

// Helper function to detect tariff/liquidity signals (Trump 2.0 Tariff Tracker)
function detectTariffLiquiditySignal(item) {
  const title = ((item.title || item.headline || '') + '').toLowerCase();
  const description = ((item.description || item.contentSnippet || '') + '').toLowerCase();
  const combined = title + ' ' + description;
  
  const tariffPatterns = [
    // Tariff changes
    /\b(trump|tariff|tariffs|trade war|trade policy)\b.*\b(china|chinese)\b.*\b(drop|reduce|cut|lower|125%|10%|from.*to)\b/i,
    // Liquidity injection signals
    /\b(liquidity|injection|stimulus|tariff reduction)\b.*\b(china|asia|asian markets)\b/i,
    // Massive tariff drops (125% to 10% = huge signal)
    /\b(tariff|tariffs)\b.*\b(125%|10%|from 125|to 10|massive drop|huge reduction)\b/i
  ];
  
  return tariffPatterns.some(pattern => pattern.test(combined));
}

// Helper function to determine article level (CRITICAL, IMPORTANT, STANDARD) based on regional keywords
function determineRegionalLevel(item, region, allRegionalData = {}) {
  const title = ((item.title || item.headline || '') + '').toLowerCase();
  const description = ((item.description || item.contentSnippet || '') + '').toLowerCase();
  const combined = title + ' ' + description;
  
  // Check for conflict flows (cross-regional) - always CRITICAL
  if (detectConflictFlow(item, allRegionalData)) {
    return 'CRITICAL';
  }
  
  // Check for commodity shifts - IMPORTANT or CRITICAL
  const hasCommodityShift = detectCommodityShift(item);
  
  // Check for tariff/liquidity signals - IMPORTANT or CRITICAL
  const hasTariffSignal = detectTariffLiquiditySignal(item);
  
  // Regional-specific critical keywords
  const regionalCritical = {
    asia: [
      /\b(hsi|hang seng|nikkei|n225|zijin|tencent|alibaba)\b.*\b(crash|plunge|halt|halted|>2%|down\s+[2-9]%)\b/i,
      /\b(hong kong|hongkong|hkex|shanghai|shenzhen)\b.*\b(emergency|urgent|breaking|alert)\b/i,
      // Tariff drops (125% to 10% = massive liquidity signal)
      /\b(tariff|tariffs)\b.*\b(125%|10%|from 125|to 10|massive drop)\b/i,
      // Nikkei recovery failure
      /\b(nikkei|n225)\b.*\b(fail|failure|breakdown|support|test lower)\b/i
    ],
    europe: [/\b(dax|gdaxi|ftse|bund|stoxx)\b.*\b(crash|plunge|halt|halted|>2%|down\s+[2-9]%)\b/i,
              /\b(germany|uk|brexit|ecb|european central bank)\b.*\b(emergency|urgent|breaking|alert)\b/i],
    mena: [
      /\b(brent|crude|oil|hormuz|strait)\b.*\b(alert|emergency|blockade|shutdown)\b/i,
      /\b(pif|saudi|uae|qatar|sovereign wealth)\b.*\b(major|>3b|billion)\b/i,
      // Dubai flight suspensions (affects Asia)
      /\b(dubai|uae|emirates)\b.*\b(suspend|suspended|halt|flight)\b.*\b(china|asia)\b/i
    ],
    latam: [/\b(lithium|heavy crude|bovespa|brazil|argentina|chile)\b.*\b(alert|emergency|major|>3b)\b/i,
            /\b(lithium triangle|vaca muerta)\b.*\b(disruption|shutdown|blockade)\b/i]
  };
  
  // Regional-specific important keywords
  const regionalImportant = {
    asia: [
      /\b(hsi|hang seng|nikkei|zijin|tencent|alibaba)\b.*\b(move|shift|change|surge|decline)\b/i,
      /\b(hong kong|hkex|shanghai)\b.*\b(announcement|update|news)\b/i,
      // Commodity shifts (Energy, Aluminum, Zijin/CNOOC)
      /\b(energy|aluminum|zijin|cnooc)\b.*\b(surge|spike|jump|rally)\b/i,
      // Tariff/liquidity signals
      /\b(tariff|tariffs|liquidity|trump)\b.*\b(china|asia)\b/i
    ],
    europe: [/\b(dax|ftse|bund|stoxx)\b.*\b(move|shift|change|surge|decline)\b/i,
             /\b(germany|uk|ecb)\b.*\b(announcement|update|news)\b/i],
    mena: [
      /\b(brent|crude|oil|hormuz)\b.*\b(move|shift|change|volatility)\b/i,
      /\b(pif|saudi|uae)\b.*\b(investment|deal|announcement)\b/i,
      // Hormuz affecting Asia
      /\b(hormuz|strait)\b.*\b(asia|china|logistics)\b/i
    ],
    latam: [/\b(lithium|heavy crude|bovespa)\b.*\b(move|shift|change|volatility)\b/i,
            /\b(lithium triangle|brazil|argentina)\b.*\b(announcement|update|news)\b/i]
  };
  
  const criticalPatterns = regionalCritical[region] || [];
  const importantPatterns = regionalImportant[region] || [];
  
  const isCritical = criticalPatterns.some(pattern => pattern.test(combined));
  const isImportant = importantPatterns.some(pattern => pattern.test(combined)) || hasCommodityShift || hasTariffSignal;
  
  // Conflict flows or commodity shifts with large moves = CRITICAL
  if (isCritical || (hasCommodityShift && /\b(surge|spike|jump|rally|>3b|billion)\b/i.test(combined))) {
    return 'CRITICAL';
  }
  if (isImportant) return 'IMPORTANT';
  return 'STANDARD';
}

// GLOBAL FLOW — News article URLs only
// API Endpoint: Get Regional Data for Global Flow tab
app.get('/api/regional-data/:region', async (req, res) => {
  const { region } = req.params;
  
  if (!['asia', 'europe', 'mena', 'latam'].includes(region)) {
    return res.status(400).json({ status: 'error', message: 'Invalid region. Must be: asia, europe, mena, or latam' });
  }

  try {
    // Return cached data if available
    if (regionalCache[region]) {
      return res.json({
        status: 'success',
        data: regionalCache[region],
        timestamp: new Date().toISOString(),
        cached: true
      });
    }
    
    // GLOBAL FLOW — Scrape news articles directly from URLs (no Twitter/Nitter)
    const urls = NEWS_SITE_URLS[region] || [];
    const scrapedArticles = await scrapeNewsArticles(urls);
    
    // Get all regional data for conflict flow detection (cross-panel analysis)
    const allRegionalData = {};
    
    // Hardcoded March 12, 2026 events for Global Flow (Macro Pulse style articles)
    const hardcodedEvents = getHardcodedMarch12Events(region);
    
    // Apply level determination and strategic analysis to scraped articles
    const articles = scrapedArticles.map(item => {
      const level = determineRegionalLevel(item, region, allRegionalData);
      const hasConflictFlow = detectConflictFlow(item, allRegionalData);
      const hasCommodityShift = detectCommodityShift(item);
      const hasTariffSignal = detectTariffLiquiditySignal(item);
      
      return {
        title: item.title || '',
        url: item.url || '#',
        source: item.source || 'Unknown',
        timestamp: item.timestamp || new Date().toISOString(),
        datetime: item.datetime || item.timestamp || new Date().toISOString(),
        pubDate: item.pubDate || item.timestamp || new Date().toISOString(),
        level: level,
        description: item.description || '',
        // Add strategic analysis flags
        conflictFlow: hasConflictFlow,
        commodityShift: hasCommodityShift,
        tariffSignal: hasTariffSignal
      };
    });
    
    // Prepend hardcoded events to the articles array (they appear first)
    const allArticles = [...hardcodedEvents, ...articles];
    
    // Cache the results
    regionalCache[region] = allArticles;

    res.json({
      status: 'success',
      data: allArticles,
      timestamp: new Date().toISOString(),
      cached: false
    });
  } catch (error) {
    console.error(`❌ Error fetching ${region} regional data:`, error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Bitcoin Correlation Tracking (BTC vs Gold vs Equities)
// Tracks if BTC is following Gold (+1.6%) or Equities (-1%)
let btcCorrelationCache = {
  btc: null,
  gold: null,
  spx: null,
  correlation: null, // 'gold' | 'equities' | 'neutral' | 'consolidating'
  lastUpdate: null
};

async function fetchBitcoinCorrelation() {
  try {
    // Fetch BTC, Gold, and SPX data (using available endpoints or simulated)
    const [btcRes, goldRes, spxRes] = await Promise.allSettled([
      axios.get(`http://localhost:${PORT}/api/crypto/btc`, { timeout: 10000 }).catch(() => null),
      axios.get(`http://localhost:${PORT}/api/commodities/gold`, { timeout: 10000 }).catch(() => null),
      axios.get(`http://localhost:${PORT}/api/strategic-pipeline`, { timeout: 10000 }).catch(() => null)
    ]);
    
    let btcPrice = null;
    let goldPrice = null;
    let spxPrice = null;
    
    // Extract BTC price
    if (btcRes.status === 'fulfilled' && btcRes.value?.data) {
      btcPrice = btcRes.value.data.price || btcRes.value.data.data?.price;
    }
    
    // Extract Gold price
    if (goldRes.status === 'fulfilled' && goldRes.value?.data) {
      goldPrice = goldRes.value.data.price || goldRes.value.data.data?.price;
    }
    
    // Extract SPX price from strategic pipeline
    if (spxRes.status === 'fulfilled' && spxRes.value?.data?.data?.strategicTickers) {
      const spx = spxRes.value.data.data.strategicTickers.find(t => 
        t.symbol === 'SPX' || t.symbol === '$SPX' || t.symbol === 'SPX500'
      );
      if (spx) spxPrice = spx.price;
    }
    
    // Calculate correlation (simplified - in production, use rolling correlation)
    let correlation = 'consolidating';
    if (btcPrice && goldPrice && spxPrice) {
      // Simplified correlation logic - real implementation would track price changes
      correlation = 'consolidating'; // Default - needs more data points for accurate correlation
    }
    
    btcCorrelationCache = {
      btc: btcPrice,
      gold: goldPrice,
      spx: spxPrice,
      correlation: correlation,
      lastUpdate: new Date().toISOString()
    };
    
    return btcCorrelationCache;
  } catch (error) {
    console.error('❌ Error fetching Bitcoin correlation:', error.message);
    return btcCorrelationCache; // Return cached data on error
  }
}

// API Endpoint: Bitcoin Correlation Tracking
app.get('/api/bitcoin-correlation', async (req, res) => {
  try {
    const data = await fetchBitcoinCorrelation();
    res.json({
      status: 'success',
      data: data
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Fetch Nikkei 225 (N225) from Twelve Data
async function fetchNikkei225() {
  try {
    const apiKey = config.twelveData?.apiKey || process.env.TWELVE_DATA_KEY || process.env.TWELVEDATA_KEY;
    if (!apiKey) {
      console.log('⚠️  Twelve Data API key not found - skipping Nikkei 225 fetch');
      return null;
    }
    
    const response = await axios.get('https://api.twelvedata.com/time_series', {
      params: {
        symbol: 'N225',
        interval: '1day',
        apikey: apiKey,
        outputsize: 1
      },
      timeout: 10000
    });
    
    if (response.data && response.data.values && response.data.values.length > 0) {
      const latest = response.data.values[0];
      return {
        symbol: 'N225',
        price: parseFloat(latest.close),
        change: parseFloat(latest.close) - parseFloat(latest.open),
        changePercent: ((parseFloat(latest.close) - parseFloat(latest.open)) / parseFloat(latest.open)) * 100,
        timestamp: latest.datetime || new Date().toISOString()
      };
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error fetching Nikkei 225:', error.message);
    return null;
  }
}

// API Endpoint: Nikkei 225 Data
app.get('/api/market/nikkei225', async (req, res) => {
  try {
    const data = await fetchNikkei225();
    if (data) {
      res.json({
        status: 'success',
        data: data
      });
    } else {
      res.json({
        status: 'error',
        message: 'Nikkei 225 data unavailable (API key may be missing)'
      });
    }
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Enhanced Regional Data with Market Context (includes Nikkei 225 for Asia)
app.get('/api/regional-data/:region/enhanced', async (req, res) => {
  const { region } = req.params;
  
  if (!['asia', 'europe', 'mena', 'latam'].includes(region)) {
    return res.status(400).json({ status: 'error', message: 'Invalid region' });
  }

  try {
    // Get standard regional data
    const regionalRes = await axios.get(`http://localhost:${PORT}/api/regional-data/${region}`).catch(() => null);
    const regionalData = regionalRes?.data?.data || [];
    
    // Add market context based on region
    const marketContext = {};
    
    if (region === 'asia') {
      // Add Nikkei 225 data
      const nikkei = await fetchNikkei225();
      if (nikkei) {
        marketContext.nikkei225 = nikkei;
      }
      
      // Add Bitcoin correlation
      const btcCorr = await fetchBitcoinCorrelation();
      if (btcCorr) {
        marketContext.bitcoinCorrelation = btcCorr;
      }
    }
    
    res.json({
      status: 'success',
      data: regionalData,
      marketContext: marketContext,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`❌ Error fetching enhanced ${region} data:`, error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Macro Pulse Interval - 5-second refresh cycle for 4-panel structure
let macroPulseIntervals = []; // Array to track all staggered intervals
let cycleCount = 0;

function initializeMacroPulse() {
  console.log('🔄 Starting Macro Pulse intervals (staggered: politics 0s, ib 20s, physical 40s, squawk 60s, full cycle 120s)...');
  
  // Initial fetch of all 4 panels (staggered starts will handle ongoing updates)
  updateMacroPulsePanels();
  
  // Staggered intervals to handle 27 accounts without rate limiting (2s delay between accounts, 120s cycle)
  // Politics: 0s offset (every 120s)
  setTimeout(() => {
    const intervalId = setInterval(async () => {
      const politicsFeeds = await fetchTwitterFeeds('politics');
      politicsFeedBuffer = politicsFeeds;
      newsCache.politics = politicsFeeds;
      console.log(`✅ Politics panel: ${politicsFeeds.length} items`);
      
      // Broadcast update
      io.emit('macroPulse:update', {
        politics: politicsFeedBuffer,
        commodity: commodityFeedBuffer,
        ib: ibFeedBuffer,
        physical: physicalFeedBuffer,
        squawk: squawkFeedBuffer,
        cycle: cycleCount++,
        timestamp: new Date().toISOString()
      });
    }, 120000); // 120 seconds
    macroPulseIntervals.push(intervalId);
  }, 0); // Start immediately
  
  // IB: 20s offset (every 120s)
  setTimeout(() => {
    const intervalId = setInterval(async () => {
      const ibFeeds = await fetchTwitterFeeds('ib');
      ibFeedBuffer = ibFeeds;
      newsCache.ib = ibFeeds;
      console.log(`✅ IB panel: ${ibFeeds.length} items`);
      
      // Broadcast update
      io.emit('macroPulse:update', {
        politics: politicsFeedBuffer,
        commodity: commodityFeedBuffer,
        ib: ibFeedBuffer,
        physical: physicalFeedBuffer,
        squawk: squawkFeedBuffer,
        cycle: cycleCount++,
        timestamp: new Date().toISOString()
      });
    }, 120000); // 120 seconds
    macroPulseIntervals.push(intervalId);
  }, 20000); // 20 second offset
  
  // Physical: 40s offset (every 120s)
  setTimeout(() => {
    const intervalId = setInterval(async () => {
      const physicalFeeds = await fetchTwitterFeeds('physical');
      physicalFeedBuffer = physicalFeeds;
      newsCache.physical = physicalFeeds;
      console.log(`✅ Physical panel: ${physicalFeeds.length} items`);
      
      // Broadcast update
      io.emit('macroPulse:update', {
        politics: politicsFeedBuffer,
        commodity: commodityFeedBuffer,
        ib: ibFeedBuffer,
        physical: physicalFeedBuffer,
        squawk: squawkFeedBuffer,
        cycle: cycleCount++,
        timestamp: new Date().toISOString()
      });
    }, 120000); // 120 seconds
    macroPulseIntervals.push(intervalId);
  }, 40000); // 40 second offset
  
  // Squawk: 60s offset (every 180s)
  setTimeout(() => {
    const intervalId = setInterval(async () => {
      const squawkFeeds = await fetchTwitterFeeds('squawk');
      // Handle metadata structure - extract items for buffer
      squawkFeedBuffer = squawkFeeds.items || squawkFeeds;
      newsCache.squawk = squawkFeeds;
      console.log(`✅ Squawk panel: ${squawkFeeds.length} items`);
      
      // Broadcast update
      io.emit('macroPulse:update', {
        politics: politicsFeedBuffer,
        commodity: commodityFeedBuffer,
        ib: ibFeedBuffer,
        physical: physicalFeedBuffer,
        squawk: squawkFeedBuffer,
        cycle: cycleCount++,
        timestamp: new Date().toISOString()
      });
    }, 180000); // 180 seconds (3 minutes)
    macroPulseIntervals.push(intervalId);
  }, 60000); // 60 second offset
  
  console.log('✅ Macro Pulse staggered intervals started (politics/ib/physical: 120s, squawk: 180s)');
}

async function updateMacroPulsePanels() {
  try {
    // Panel 1: Politics (POTUS, SecWar, Austan_Goolsbee, stlouisfed, elerianm, MacroAlf) - 6 accounts
    const politicsFeeds = await fetchTwitterFeeds('politics');
    politicsFeedBuffer = politicsFeeds;
    newsCache.politics = politicsFeeds;
    console.log(`✅ Politics panel: ${politicsFeeds.length} items`);

    // Panel 2: Commodity (empty - using FinancialJuice for commodity news via squawk)
    const commodityFeeds = await fetchTwitterFeeds('commodity');
    commodityFeedBuffer = commodityFeeds;
    newsCache.commodity = commodityFeeds;
    console.log(`✅ Commodity panel: ${commodityFeeds.length} items`);

    // Panel 3: IB (dealertAI, CitronResearch, davidein, DougKass) - 4 accounts
    const ibFeeds = await fetchTwitterFeeds('ib');
    ibFeedBuffer = ibFeeds;
    newsCache.ib = ibFeeds;
    console.log(`✅ IB panel: ${ibFeeds.length} items`);

    // Panel 4: Physical Pipeline Flow (JavierBlas, GoldmanSachs, PIMCO, kitjuckes, mark_dow, lisaabramowicz1) - 6 accounts
    const physicalFeeds = await fetchTwitterFeeds('physical');
    physicalFeedBuffer = physicalFeeds;
    newsCache.physical = physicalFeeds;
    console.log(`✅ Physical panel: ${physicalFeeds.length} items`);

    // Panel 5: Squawk (financialjuice, NickTimiraos, RiskReversal, ritholtz, conorsen, SpotGamma, unusual_whales, MacroAlf, zerohedge, markets) - 10 accounts
    const squawkFeeds = await fetchTwitterFeeds('squawk');
    // Handle metadata structure - extract items for buffer
    squawkFeedBuffer = squawkFeeds.items || squawkFeeds;
    newsCache.squawk = squawkFeeds;
    const itemCount = Array.isArray(squawkFeeds) ? squawkFeeds.length : (squawkFeeds.items?.length || 0);
    console.log(`✅ Squawk panel: ${itemCount} items`);
  } catch (error) {
    console.error('❌ Error updating Macro Pulse panels:', error);
  }
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('✅ Client connected:', socket.id);
  
  // Send initial Macro Pulse data
  socket.emit('macroPulse:update', {
    politics: politicsFeedBuffer,
    commodity: commodityFeedBuffer,
    ib: ibFeedBuffer,
    physical: physicalFeedBuffer, // Physical Pipeline Flow
    squawk: squawkFeedBuffer,
    cycle: cycleCount,
    timestamp: new Date().toISOString()
  });

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
  });
});

// API Endpoint: Whale Radar (UNI, BCH, LINK accumulation)
app.get('/api/whale-radar', async (req, res) => {
  try {
    // Simulated whale radar data with UNI, BCH, LINK accumulation
    const whaleData = {
      whales: [
        {
          symbol: 'UNI',
          name: 'Uniswap',
          volume: 2500000,
          price: 12.45,
          change: 3.2,
          accumulation: true,
          onChain: true,
          timestamp: new Date().toISOString()
        },
        {
          symbol: 'BCH',
          name: 'Bitcoin Cash',
          volume: 1800000,
          price: 485.30,
          change: 2.8,
          accumulation: true,
          onChain: true,
          timestamp: new Date().toISOString()
        },
        {
          symbol: 'LINK',
          name: 'Chainlink',
          volume: 3200000,
          price: 18.75,
          change: 4.1,
          accumulation: true,
          onChain: true,
          timestamp: new Date().toISOString()
        }
      ],
      summary: {
        totalVolume: 7500000,
        activeWhales: 3,
        focus: 'UNI, BCH, and LINK accumulation detected on-chain'
      }
    };
    
    res.json({
      status: 'success',
      data: whaleData
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// API Endpoint: Strategic Pipeline (T-Bill financing shifts, US Debt)
app.get('/api/strategic-pipeline', async (req, res) => {
  try {
    // Strategic pipeline data with T-Bill financing and US Debt monitoring
    const pipelineData = {
      strategicTickers: [
        {
          symbol: 'ES1!',
          price: 6830.00,
          change: 12.50,
          changePercent: 0.18,
          volume: 1250000
        },
        {
          symbol: 'SPX',
          price: 5420.50,
          change: 8.25,
          changePercent: 0.15,
          volume: 0
        }
      ],
      tBillFinancing: {
        status: 'MONITORING',
        shifts: 'T-Bill financing shifts detected as US Debt hits $38.5 Trillion',
        debtLevel: 38500000000000, // $38.5 Trillion
        debtLevelFormatted: '$38.5T',
        lastUpdate: new Date().toISOString()
      },
      summary: {
        focus: 'Monitor T-Bill financing shifts as US Debt hits $38.5 Trillion',
        riskLevel: 'ELEVATED'
      }
    };
    
    res.json({
      status: 'success',
      data: pipelineData
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Health check function for Nitter instances
async function checkNitterInstanceHealth(instanceUrl) {
  try {
    // Test the base URL itself, not specific accounts
    // A 403 on a specific account (like POTUS) should NOT disqualify the instance
    // Only disqualify if the base URL itself returns 403/500 or connection errors
    const baseUrl = instanceUrl.endsWith('/') ? instanceUrl : `${instanceUrl}/`;
    
    try {
      const response = await axios.get(baseUrl, {
        timeout: 10000,
        httpsAgent: nitterAgent,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        validateStatus: (status) => status < 500 // Accept anything except 5xx server errors
      });
      
      // Only disqualify if base URL returns 403 or 500+ (server errors)
      // 404, 200, etc. are fine - means the instance is reachable
      if (response.status === 403) {
        return { url: instanceUrl, status: 'skipped', working: false, error: 'Base URL returned 403 Forbidden', skip: true };
      }
      
      if (response.status >= 500) {
        return { url: instanceUrl, status: 'down', working: false, error: `Base URL returned ${response.status}` };
      }
      
      // Instance is healthy if base URL is reachable (200, 404, etc. are all fine)
      return { url: instanceUrl, status: 'alive', working: true, httpStatus: response.status };
      
    } catch (err) {
      const errorMsg = err.message || err.toString();
      
      // Check for connection/network errors (these disqualify the instance)
      if (err.response) {
        const status = err.response.status;
        // Only disqualify on base URL 403 or 500+ errors
        if (status === 403) {
          return { url: instanceUrl, status: 'skipped', working: false, error: 'Base URL returned 403 Forbidden', skip: true };
        }
        if (status >= 500) {
          return { url: instanceUrl, status: 'down', working: false, error: `Base URL returned ${status}` };
        }
        // Other status codes (404, etc.) are fine - instance is reachable
        return { url: instanceUrl, status: 'alive', working: true, httpStatus: status };
      }
      
      // Network/connection errors disqualify the instance
      if (errorMsg.includes('timeout') ||
          errorMsg.includes('Timeout') ||
          errorMsg.includes('ETIMEDOUT') ||
          errorMsg.includes('ECONNREFUSED') ||
          errorMsg.includes('ECONNRESET') ||
          errorMsg.includes('ENOTFOUND') ||
          errorMsg.includes('DNS') ||
          errorMsg.includes('getaddrinfo')) {
        return { url: instanceUrl, status: 'down', working: false, error: errorMsg };
      }
      
      // Certificate errors - skip but don't mark as down (might be temporary)
      if (errorMsg.includes('certificate') || 
          errorMsg.includes('CERT') ||
          errorMsg.includes('UNABLE_TO_VERIFY_LEAF_SIGNATURE')) {
        return { url: instanceUrl, status: 'skipped', working: false, error: errorMsg, skip: true };
      }
      
      // Unknown error - mark as down
      return { url: instanceUrl, status: 'down', working: false, error: errorMsg };
    }
  } catch (error) {
    // Outer catch for any unexpected errors
    const errorMsg = error.message || error.toString();
    return { url: instanceUrl, status: 'down', working: false, error: errorMsg };
  }
}

// Health check all Nitter instances on startup
async function checkAllNitterInstances() {
  console.log('\n🔍 Checking Nitter instance health...');
  const healthChecks = await Promise.allSettled(
    NITTER_INSTANCES.map(instance => checkNitterInstanceHealth(instance))
  );
  
  const results = healthChecks.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    }
    return { url: NITTER_INSTANCES[index], status: 'error', working: false, error: result.reason?.message || 'Unknown error' };
  });
  
  // Filter: only use instances that are working (base URL is reachable)
  // Accept any HTTP status < 500 (200, 404, etc. all mean the instance is reachable)
  const aliveInstances = results.filter(r => r.working === true);
  const skippedInstances = results.filter(r => r.skip === true);
  const deadInstances = results.filter(r => !r.working && !r.skip);
  
  console.log(`\n📊 Nitter Instance Health Check Results:`);
  console.log(`   ✅ Alive (Base URL reachable): ${aliveInstances.length}/${results.length} instances`);
  aliveInstances.forEach(instance => {
    console.log(`      ✅ ${instance.url}`);
  });
  
  if (skippedInstances.length > 0) {
    console.log(`   ⏭️  Skipped (403/Cert/DNS errors): ${skippedInstances.length} instances`);
    skippedInstances.forEach(instance => {
      console.log(`      ⏭️  ${instance.url} - ${instance.error || instance.status}`);
    });
  }
  
  if (deadInstances.length > 0) {
    console.log(`   ❌ Down: ${deadInstances.length} instances`);
    deadInstances.forEach(instance => {
      console.log(`      ❌ ${instance.url} - ${instance.error || instance.status}`);
    });
  }
  
  if (aliveInstances.length === 0) {
    console.log(`\n⚠️  WARNING: All Nitter instances failed health check!`);
    console.log(`   Twitter feed fetching will be disabled.`);
    console.log(`   Will retry health check in 5 minutes...`);
    return { allFailed: true, results };
  } else {
    console.log(`\n✅ Using ${aliveInstances.length} working instance(s) for Twitter feeds`);
    return { allFailed: false, results, aliveInstances };
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Retry health check if all instances fail (wait 5 minutes)
let healthCheckRetryInterval = null;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function performHealthCheckWithRetry() {
  const healthResult = await checkAllNitterInstances();
  
  if (healthResult.allFailed) {
    // All instances failed - use fallback instance instead of giving up
    console.log(`\n⚠️ All Nitter instances failed health check — using fallback instance`);
    workingNitterInstances = [...FALLBACK_INSTANCES];
    console.log(`   ✅ Using fallback: ${FALLBACK_INSTANCES[0]}`);
    
    // Still retry health check in background (but don't block)
    setTimeout(async () => {
      console.log(`\n🔄 Retrying Nitter instance health check in background...`);
      const retryResult = await checkAllNitterInstances();
      if (!retryResult.allFailed && retryResult.aliveInstances.length > 0) {
        workingNitterInstances = retryResult.aliveInstances.map(inst => inst.url);
        console.log(`   ✅ Health check passed - updated working instances`);
      }
    }, 5 * 60 * 1000); // 5 minutes
  } else {
    // Update working instances list to only include alive ones
    workingNitterInstances = healthResult.aliveInstances.map(inst => inst.url);
  }
  
  // Update shared config for other modules (worker.js, nitterClient.js)
  setWorkingInstances(workingNitterInstances);
}

// Start server
server.listen(PORT, async () => {
  console.log(`⚡ ES1! Command Center - Zero-API Build running on http://localhost:${PORT}`);
  console.log(`📊 Data Sources (No API Keys Required):`);
  console.log(`   ✅ Simulated Data (Whale Radar, FRED, EIA, Strategic Pipeline)`);
  console.log(`   ✅ Government-Direct (SEC EDGAR, Federal Reserve)`);
  console.log(`   ✅ RSS Feeds (Nitter)`);
  console.log(`\n🌐 Dashboard: http://localhost:${PORT}`);
  console.log(`📡 Socket.IO real-time updates enabled`);
  
  // Check Nitter instance health on startup - MUST complete before any fetches start
  console.log(`\n🔍 Performing initial Nitter health check...`);
  await performHealthCheckWithRetry();
  
  // Ensure workingNitterInstances is populated (use fallback if needed)
  if (workingNitterInstances.length === 0) {
    workingNitterInstances = [...FALLBACK_INSTANCES];
    console.log(`   ✅ Using fallback instances: ${FALLBACK_INSTANCES.join(', ')}`);
  }
  
  // Update shared config for other modules
  setWorkingInstances(workingNitterInstances);
  
  console.log(`\n✅ Health check complete. Working instances: ${workingNitterInstances.join(', ')}`);
  console.log(`\n⚡ Macro Pulse: Starting intervals AFTER health check completion...`);
  
  // Initialize Macro Pulse ONLY after health check is fully complete
  initializeMacroPulse();
  
  // GLOBAL FLOW — News article URLs only
  // Initialize Regional Data refresh for Global Flow tab (every 5 minutes)
  console.log(`\n🌍 Global Flow: Starting regional data refresh intervals...`);
  const refreshRegionalData = async (region) => {
    try {
      // GLOBAL FLOW — Scrape news articles directly from URLs (no Twitter/Nitter)
      const urls = NEWS_SITE_URLS[region] || [];
      const scrapedArticles = await scrapeNewsArticles(urls);
      
      // Apply level determination and strategic analysis
      const allRegionalData = {};
      const articles = scrapedArticles.map(item => {
        const level = determineRegionalLevel(item, region, allRegionalData);
        const hasConflictFlow = detectConflictFlow(item, allRegionalData);
        const hasCommodityShift = detectCommodityShift(item);
        const hasTariffSignal = detectTariffLiquiditySignal(item);
        
        return {
          title: item.title || '',
          url: item.url || '#',
          source: item.source || 'Unknown',
          timestamp: item.timestamp || new Date().toISOString(),
          datetime: item.datetime || item.timestamp || new Date().toISOString(),
          pubDate: item.pubDate || item.timestamp || new Date().toISOString(),
          level: level,
          description: item.description || '',
          conflictFlow: hasConflictFlow,
          commodityShift: hasCommodityShift,
          tariffSignal: hasTariffSignal
        };
      });
      
      // Prepend hardcoded events
      const hardcodedEvents = getHardcodedMarch12Events(region);
      const allArticles = [...hardcodedEvents, ...articles];
      
      regionalCache[region] = allArticles;
      console.log(`✅ ${region.toUpperCase()} regional data: ${allArticles.length} articles (${scrapedArticles.length} scraped + ${hardcodedEvents.length} hardcoded)`);
    } catch (error) {
      console.error(`❌ Error refreshing ${region} regional data:`, error.message);
    }
  };
  
  // Initial fetch for all regions
  ['asia', 'europe', 'mena', 'latam'].forEach(region => {
    refreshRegionalData(region);
  });
  
  // Set up periodic refresh (every 5 minutes, staggered by 30 seconds per region)
  ['asia', 'europe', 'mena', 'latam'].forEach((region, index) => {
    setTimeout(() => {
      setInterval(() => refreshRegionalData(region), 300000); // 5 minutes
    }, index * 30000); // 30 second stagger
  });
  
  console.log(`✅ Regional data refresh intervals started (5 min cycle, 30s stagger)`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  macroPulseIntervals.forEach(intervalId => clearInterval(intervalId));
  macroPulseIntervals = [];
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT received, shutting down gracefully...');
  macroPulseIntervals.forEach(intervalId => clearInterval(intervalId));
  macroPulseIntervals = [];
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
