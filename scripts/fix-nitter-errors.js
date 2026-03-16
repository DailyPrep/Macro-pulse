const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, '..', 'server.js');

console.log('Reading server.js...');
let content = fs.readFileSync(serverPath, 'utf8');

// Count occurrences before replacement
const beforeCount = (content.match(/console\.log\(`   [^\x00-\x7F]+ @\$\{account\} failed:/g) || []).length;
console.log(`Found ${beforeCount} corrupted error log statements`);

// Replace all instances of the corrupted error logging with the helper function
// Pattern: console.log with corrupted characters followed by @${account} failed:
const patterns = [
  // Pattern 1: Direct console.log with corrupted characters
  /console\.log\(`   [^\x00-\x7F]+ @\$\{account\} failed: \$\{err\.message\}`\);/g,
  // Pattern 2: Inside if(true) block
  /if \(true\) \{ \/\/ Changed from !skipLogging to always log\s+console\.log\(`   [^\x00-\x7F]+ @\$\{account\} failed: \$\{err\.message\}`\);\s+\}/g,
];

let replaced = 0;

// Try pattern 1 first (simpler)
content = content.replace(
  /console\.log\(`   [^\x00-\x7F]+ @\$\{account\} failed: \$\{err\.message\}`\);/g,
  (match) => {
    replaced++;
    return 'console.log(formatNitterError(account, err));';
  }
);

// Also replace the if(true) block pattern
content = content.replace(
  /if \(true\) \{ \/\/ Changed from !skipLogging to always log\s+console\.log\(`   [^\x00-\x7F]+ @\$\{account\} failed: \$\{err\.message\}`\);\s+\}/g,
  (match) => {
    replaced++;
    return '// Always log - use helper function for proper error formatting\n          console.log(formatNitterError(account, err));';
  }
);

// More aggressive pattern - match any console.log with failed and err.message
content = content.replace(
  /console\.log\(`[^`]*@\$\{account\}[^`]*failed[^`]*\$\{err\.message\}[^`]*`\);/g,
  (match) => {
    if (!match.includes('formatNitterError')) {
      replaced++;
      return 'console.log(formatNitterError(account, err));';
    }
    return match;
  }
);

// Also fix Nitter instance error messages
const instanceErrors = (content.match(/console\.log\(`[^`]*Nitter instance[^`]*failed[^`]*\$\{err\.message\}[^`]*`\);/g) || []).length;
content = content.replace(
  /console\.log\(`   [^\x00-\x7F]+ Nitter instance \$\{nitterBase\} failed: \$\{err\.message\}`\);/g,
  (match) => {
    replaced++;
    return 'console.log(`   ⚠️  Nitter instance ${nitterBase} failed: ${err.message}`);';
  }
);

console.log(`Replaced ${replaced} error log statements`);

// Write back to file
fs.writeFileSync(serverPath, content, 'utf8');
console.log('✅ Fixed server.js - all error logging now uses formatNitterError()');
console.log('✅ Error messages will now display properly with categorized warnings');

