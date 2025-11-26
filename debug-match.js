const db = require('./src/config/database');
const DatabaseMatcher = require('./src/services/mcp/DatabaseMatcher');

(async () => {
  await db.connect();
  await DatabaseMatcher.initializeHotCache();

  console.log('Testing category match for "سيارة"...\n');

  const tokens = ['سيارة', 'في', 'إدلب', 'للبيع'];
  const result = await DatabaseMatcher.matchCategory(tokens, 'ar');

  console.log('Match result:');
  if (result) {
    console.log(`  Name: ${result.name_ar}`);
    console.log(`  Slug: ${result.slug}`);
    console.log(`  Confidence: ${result.confidence}`);
    console.log(`  Method: ${result.method}`);
  } else {
    console.log('  No match found');
  }

  // Check cars category in hot cache
  const carsCategory = DatabaseMatcher.hotCache.categories.rows.find(c => c.slug === 'cars');
  console.log('\nCars category in hot cache:');
  if (carsCategory) {
    console.log(`  Name: ${carsCategory.name_ar}`);
    console.log(`  Keywords AR: ${carsCategory.keywords_ar ? carsCategory.keywords_ar.join(', ') : 'NONE'}`);
    const hasKeyword = carsCategory.keywords_ar && carsCategory.keywords_ar.includes('سيارة');
    console.log(`  Has 'سيارة'? ${hasKeyword ? 'YES ✅' : 'NO ❌'}`);
  } else {
    console.log('  Cars category not found in hot cache!');
  }

  // Check residential category
  const residentialCategory = DatabaseMatcher.hotCache.categories.rows.find(c => c.slug === 'residential');
  console.log('\nResidential category in hot cache:');
  if (residentialCategory) {
    console.log(`  Name: ${residentialCategory.name_ar}`);
    console.log(`  Keywords AR: ${residentialCategory.keywords_ar ? residentialCategory.keywords_ar.join(', ') : 'NONE'}`);
  }

  process.exit(0);
})();
