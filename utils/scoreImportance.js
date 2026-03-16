const HIGH_IMPACT_KEYWORDS = require('../config/highImpactKeywords');

// Function to score importance of a news item/tweet
function scoreImportance(item, category) {
  const text = ((item.headline || '') + ' ' + (item.summary || '')).toLowerCase();
  const keywords = HIGH_IMPACT_KEYWORDS[category] || { critical: [], important: [] };

  let score = 0;
  let matchedKeywords = [];

  // Critical keywords = 10 points each
  keywords.critical.forEach(keyword => {
    if (text.includes(keyword.toLowerCase())) {
      score += 10;
      matchedKeywords.push(keyword);
    }
  });

  // Important keywords = 5 points each
  keywords.important.forEach(keyword => {
    if (text.includes(keyword.toLowerCase())) {
      score += 5;
      if (!matchedKeywords.includes(keyword)) {
        matchedKeywords.push(keyword);
      }
    }
  });

  // Boost score if from verified source (Twitter accounts are already verified)
  if (item.source && item.source.startsWith('Twitter:')) {
    score += 2;
  }

  // Boost score if recent (within last hour)
  const itemDate = new Date(item.datetime || item.pubDate || 0);
  const hoursAgo = (Date.now() - itemDate.getTime()) / (1000 * 60 * 60);
  if (hoursAgo < 1) {
    score += 3;
  } else if (hoursAgo < 6) {
    score += 1;
  }

  return {
    score,
    level: score >= 15 ? 'CRITICAL' : score >= 8 ? 'IMPORTANT' : 'MONITORING',
    matchedKeywords: [...new Set(matchedKeywords)] // Remove duplicates
  };
}

module.exports = { scoreImportance };

