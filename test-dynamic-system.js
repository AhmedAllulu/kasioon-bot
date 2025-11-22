/**
 * Test Script for Dynamic System
 * Run with: node test-dynamic-system.js
 */

require('dotenv').config();

const dynamicDataManager = require('./src/services/data/dynamicDataManager');
const messageAnalyzer = require('./src/services/analysis/messageAnalyzer');
const searchParamsBuilder = require('./src/services/search/searchParamsBuilder');

async function testDynamicSystem() {
  console.log('🧪 [TEST] Starting Dynamic System Test...\n');

  try {
    // Test 1: Load Structure
    console.log('📦 [TEST 1] Loading structure from API...');
    const structure = await dynamicDataManager.loadStructure('ar');
    console.log('✅ [TEST 1] Structure loaded!');
    console.log(`   Categories: ${structure.categories?.length || 0}`);
    console.log(`   Locations: ${structure.locations?.length || 0}\n`);

    // Test 2: Get Categories
    console.log('📂 [TEST 2] Getting categories...');
    const categories = await dynamicDataManager.getCategories('ar');
    console.log('✅ [TEST 2] Categories loaded!');
    console.log(`   Total: ${categories.length}`);
    console.log(`   Sample: ${categories.slice(0, 3).map(c => c.slug).join(', ')}\n`);

    // Test 3: Get Category Filters
    if (categories.length > 0) {
      const testCategory = categories[0].slug;
      console.log(`🔍 [TEST 3] Getting filters for category: ${testCategory}...`);
      const filters = await dynamicDataManager.getCategoryFilters(testCategory, 'ar');
      if (filters) {
        console.log('✅ [TEST 3] Filters loaded!');
        console.log(`   Attributes: ${filters.filters?.attributes?.length || 0}\n`);
      } else {
        console.log('⚠️  [TEST 3] No filters available for this category\n');
      }
    }

    // Test 4: Message Analysis
    const testMessages = [
      'شقة للبيع في دمشق 3 غرف أقل من 5 مليون',
      'سيارة تويوتا موديل 2020 في حلب',
      'موبايل سامسونج مستعمل'
    ];

    for (let i = 0; i < testMessages.length; i++) {
      const msg = testMessages[i];
      console.log(`💬 [TEST ${i + 4}] Analyzing message: "${msg}"...`);

      const analysis = await messageAnalyzer.analyze(msg, 'ar');

      console.log(`   Category: ${analysis.category?.slug || 'N/A'}`);
      console.log(`   Location: ${analysis.location?.name || 'N/A'}`);
      console.log(`   Transaction: ${analysis.transactionType || 'N/A'}`);
      console.log(`   Attributes: ${Object.keys(analysis.attributes).length}`);
      console.log(`   Confidence: ${analysis.confidence}%`);

      const searchParams = searchParamsBuilder.build(analysis);
      console.log(`   Search Params: ${JSON.stringify(searchParams, null, 2)}\n`);
    }

    // Test 5: Cache Stats
    console.log('📊 [TEST] Cache Statistics:');
    const stats = dynamicDataManager.getCacheStats();
    console.log(JSON.stringify(stats, null, 2));

    console.log('\n✅ [TEST] All tests completed successfully!');

  } catch (error) {
    console.error('❌ [TEST] Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
testDynamicSystem().then(() => {
  console.log('\n🎉 [TEST] Dynamic System is working correctly!');
  process.exit(0);
}).catch(error => {
  console.error('\n💥 [TEST] Fatal error:', error);
  process.exit(1);
});
