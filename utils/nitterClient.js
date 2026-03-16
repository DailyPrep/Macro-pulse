const RSSParser = require('rss-parser');
const https = require('https');
const axios = require('axios');
const { getWorkingInstances } = require('../config/workingNitterInstances');

// HTTPS agent for all Nitter requests
const nitterAgent = new https.Agent({ rejectUnauthorized: false });

const rssParser = new RSSParser({
  customFields: {
    item: ['description', 'pubDate', 'link', 'content:encoded', 'content']
  },
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
  },
  timeout: 15000,
  maxRedirects: 5,
  requestOptions: {
    timeout: 15000,
    rejectUnauthorized: false,
    httpsAgent: nitterAgent
  }
});

// Fetch deal flow from Nitter (commodity-focused accounts)
async function fetchNitterDealFlow(commodityAccounts) {
  const deals = [];
  let workingInstance = null;

  // Use working instances from shared config (only confirmed working instances)
  const instancesToTry = getWorkingInstances();

  for (const nitterBase of instancesToTry) {
    try {
      for (const account of commodityAccounts) {
        try {
          // Strip @ symbol from account name if present
          const cleanAccount = account.replace(/^@/, '');
          const rssUrl = `${nitterBase}/${cleanAccount}/rss`;
          const feed = await Promise.race([
            rssParser.parseURL(rssUrl),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
          ]);

          if (feed && feed.items && feed.items.length > 0) {
            workingInstance = nitterBase;
            const items = feed.items.slice(0, 5).map(item => ({
              title: item.title || item.contentSnippet || '',
              text: item.title || item.contentSnippet || '',
              source: `Twitter: @${account}`,
              url: item.link || `https://twitter.com/${account}`,
              timestamp: item.pubDate || item.isoDate || new Date().toISOString()
            }));
            deals.push(...items);
          }
        } catch (err) {
          const isRetryableError = err.message && (
            err.message.includes('502') || err.message.includes('403') ||
            err.message.includes('ECONNREFUSED') || err.message.includes('ECONNRESET')
          );
          if (isRetryableError) {
            throw err; // Trigger instance switch
          }
        }
      }
      
      if (deals.length > 0) break;
    } catch (err) {
      const isRetryableError = err.message && (
        err.message.includes('502') || err.message.includes('403') ||
        err.message.includes('ECONNREFUSED')
      );
      if (isRetryableError) {
        continue; // Try next instance
      }
    }
  }

  return { deals, workingInstance };
}

// Generic function to fetch Twitter feeds via Nitter
async function fetchTwitterFeeds(accounts, maxItems = 10) {
  const feeds = [];
  let workingInstance = null;

  // Use working instances from shared config (only confirmed working instances)
  const instancesToTry = getWorkingInstances();

  for (const nitterBase of instancesToTry) {
    try {
      for (const account of accounts) {
        try {
          // Strip @ symbol from account name if present
          const cleanAccount = account.replace(/^@/, '');
          const rssUrl = `${nitterBase}/${cleanAccount}/rss`;
          const feed = await Promise.race([
            rssParser.parseURL(rssUrl),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
          ]);

          if (feed && feed.items && feed.items.length > 0) {
            workingInstance = nitterBase;
            const items = feed.items.slice(0, maxItems).map(item => ({
              title: item.title || item.contentSnippet || '',
              text: item.title || item.contentSnippet || '',
              description: item.contentSnippet || item.content || '',
              source: `Twitter: @${account}`,
              url: item.link || `https://twitter.com/${account}`,
              timestamp: item.pubDate || item.isoDate || new Date().toISOString(),
              datetime: item.pubDate || item.isoDate || new Date().toISOString()
            }));
            feeds.push(...items);
          }
        } catch (err) {
          // Continue to next account
        }
      }
      
      if (feeds.length > 0) break;
    } catch (err) {
      // Try next instance
      continue;
    }
  }

  return { feeds, workingInstance };
}

module.exports = { fetchNitterDealFlow, fetchTwitterFeeds, rssParser };

