const db = require('./src/config/database');
const DatabaseMatcher = require('./src/services/mcp/DatabaseMatcher');
const ArabicNormalizer = require('./src/utils/arabicNormalizer');

(async () => {
  await db.connect();
  await DatabaseMatcher.initializeHotCache();

  const query = 'سيارة في إدلب';
  const tokens = query.split(/\s+/);
  const normalizedTokens = tokens.map(t => ArabicNormalizer.normalizeAndLower(t));

  console.log('Testing full match flow:\n');
  console.log('Query:', query);
  console.log('Tokens:', tokens.join(', '));
  console.log('Normalized:', normalizedTokens.join(', '));
  console.log();

  const result = await DatabaseMatcher.matchCategory(tokens, 'ar');

  console.log('Match result:');
  if (result) {
    console.log('  Category:', result.name_ar);
    console.log('  Slug:', result.slug);
    console.log('  Confidence:', result.confidence);
    console.log('  Method:', result.method);
  } else {
    console.log('  No match');
  }

  process.exit(0);
})();
