/**
 * Test file for intelligent search with keyword expansion
 * اختبار البحث الذكي مع توسيع الكلمات المفتاحية
 *
 * Usage: node tests/test-intelligent-search.js
 */

require('dotenv').config();
const aiAgent = require('../src/services/ai/agent');

// Test cases with different scenarios
const testCases = [
  {
    name: 'Test 1: شقة في دمشق (Apartment in Damascus)',
    message: 'بدي شقة للبيع في دمشق',
    language: 'ar',
    expected: {
      expandedKeywords: ['شقة', 'شقق', 'استديو', 'وحدة سكنية', 'apartment'],
      suggestedCategories: ['real-estate'],
      location: 'دمشق'
    }
  },
  {
    name: 'Test 2: سيارة تويوتا (Toyota car)',
    message: 'أريد سيارة تويوتا في حلب',
    language: 'ar',
    expected: {
      mainKeyword: 'تويوتا',
      expandedKeywords: ['تويوتا', 'toyota', 'توي', 'طويوطة'],
      suggestedCategories: ['vehicles'],
      location: 'حلب'
    }
  },
  {
    name: 'Test 3: لابتوب مستعمل (Used laptop)',
    message: 'بدي لابتوب مستعمل',
    language: 'ar',
    expected: {
      mainKeyword: 'لابتوب',
      expandedKeywords: ['لابتوب', 'laptop', 'حاسوب محمول', 'كمبيوتر محمول'],
      suggestedCategories: ['electronics']
    }
  }
];

/**
 * Run all test cases
 */
async function runTests() {
  console.log('🧪 ========================================');
  console.log('🧪 INTELLIGENT SEARCH TESTS');
  console.log('🧪 ========================================\n');

  for (const testCase of testCases) {
    console.log(`\n📝 ${testCase.name}`);
    console.log('─'.repeat(60));
    console.log(`💬 User message: "${testCase.message}"`);
    console.log(`🌐 Language: ${testCase.language}`);

    try {
      // Step 1: Analyze message with keyword expansion
      console.log('\n📊 Step 1: Analyzing message with AI...');
      const aiResponse = await aiAgent.analyzeMessage(testCase.message, testCase.language);

      console.log('\n✅ AI Response:');
      console.log(JSON.stringify(aiResponse, null, 2));

      // Validate response structure
      console.log('\n🔍 Validation:');
      if (aiResponse.mainKeyword) {
        console.log(`✅ Main keyword extracted: "${aiResponse.mainKeyword}"`);
      } else {
        console.log('⚠️  No main keyword extracted');
      }

      if (aiResponse.expandedKeywords && aiResponse.expandedKeywords.length > 0) {
        console.log(`✅ Expanded keywords (${aiResponse.expandedKeywords.length}):`, aiResponse.expandedKeywords);
      } else {
        console.log('⚠️  No expanded keywords');
      }

      if (aiResponse.suggestedCategories && aiResponse.suggestedCategories.length > 0) {
        console.log(`✅ Suggested categories:`, aiResponse.suggestedCategories);
      } else {
        console.log('⚠️  No suggested categories');
      }

      if (aiResponse.location || aiResponse.city) {
        console.log(`✅ Location: ${aiResponse.location || aiResponse.city}`);
      }

      // Step 2: Search marketplace with intelligent search
      console.log('\n🔍 Step 2: Searching marketplace...');
      const searchResults = await aiAgent.searchMarketplace(
        aiResponse,
        testCase.message,
        testCase.language
      );

      console.log('\n📊 Search Results:');
      console.log(`   Results count: ${searchResults.results?.length || 0}`);
      console.log(`   Search type: ${searchResults.searchType || searchResults.usedStrategy || 'unknown'}`);
      if (searchResults.fallbackMessage) {
        console.log(`   Fallback message: ${searchResults.fallbackMessage}`);
      }
      if (searchResults.matchedCategories) {
        console.log(`   Matched categories:`, searchResults.matchedCategories);
      }

      // Show first 3 results
      if (searchResults.results && searchResults.results.length > 0) {
        console.log('\n📋 First 3 results:');
        searchResults.results.slice(0, 3).forEach((result, index) => {
          console.log(`   ${index + 1}. ${result.title || result.name || 'Untitled'}`);
          if (result._matchedCategory) {
            console.log(`      Category: ${result._matchedCategory.name} (${result._matchedCategory.source})`);
          }
        });
      }

      console.log('\n✅ Test completed successfully');

    } catch (error) {
      console.error('\n❌ Test failed:', error.message);
      console.error('Stack:', error.stack);
    }

    console.log('\n' + '='.repeat(60));
  }

  console.log('\n🎉 All tests completed!\n');
}

// Run tests
if (require.main === module) {
  runTests()
    .then(() => {
      console.log('✅ Test suite finished');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { runTests, testCases };
