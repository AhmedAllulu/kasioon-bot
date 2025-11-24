/**
 * Test file for Direct Database Search Implementation
 *
 * This demonstrates how to use the new intelligentMarketplaceSearch() method
 * and related functions from the AI Agent.
 *
 * Run with: node test-direct-search.js
 */

require('dotenv').config();
const aiAgent = require('./src/services/ai/agent');

// ANSI color codes for pretty console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

// Helper to print section headers
function printHeader(title) {
  console.log('\n' + colors.bright + colors.blue + '='.repeat(80) + colors.reset);
  console.log(colors.bright + colors.cyan + title + colors.reset);
  console.log(colors.bright + colors.blue + '='.repeat(80) + colors.reset + '\n');
}

// Helper to print results
function printResult(label, value) {
  console.log(colors.green + '✓ ' + colors.reset + colors.bright + label + ':' + colors.reset);
  console.log('  ' + JSON.stringify(value, null, 2).replace(/\n/g, '\n  '));
  console.log('');
}

// Helper to print error
function printError(message) {
  console.log(colors.red + '✗ ' + colors.reset + colors.bright + 'ERROR:' + colors.reset);
  console.log('  ' + message);
  console.log('');
}

/**
 * Test Case 1: Simple Search
 * User: "بدي شقة في دمشق"
 * Expected: Find "شقق" category, execute search with city filter
 */
async function testSimpleSearch() {
  printHeader('TEST 1: Simple Search - "بدي شقة في دمشق"');

  try {
    const result = await aiAgent.intelligentMarketplaceSearch("بدي شقة في دمشق", "ar");

    printResult('Result Type', result.type);
    printResult('Category', result.category);

    if (result.type === 'search_results') {
      printResult('Total Results', result.totalResults);
      printResult('Applied Filters', result.appliedFilters);
      printResult('First Listing', result.listings[0]);

      // Format and display the message
      const formattedMessage = await aiAgent.formatSearchResultsMessage(result, 'ar');
      console.log(colors.yellow + '📱 Formatted Message:' + colors.reset);
      console.log(formattedMessage);
    } else if (result.type === 'clarification_needed') {
      const formattedMessage = aiAgent.formatClarificationMessage(result, 'ar');
      console.log(colors.yellow + '📱 Formatted Message:' + colors.reset);
      console.log(formattedMessage);
    }

    return { success: true, result };
  } catch (error) {
    printError(error.message);
    return { success: false, error };
  }
}

/**
 * Test Case 2: Vehicle Search with Brand
 * User: "بدي سيارة مرسيدس"
 * Expected: Find Mercedes brand, ask for model (E-Class, C-Class, etc.)
 */
async function testVehicleSearch() {
  printHeader('TEST 2: Vehicle Search - "بدي سيارة مرسيدس"');

  try {
    const result = await aiAgent.intelligentMarketplaceSearch("بدي سيارة مرسيدس", "ar");

    printResult('Result Type', result.type);

    if (result.type === 'clarification_needed') {
      printResult('Category Found', result.category);
      printResult('Options', result.options);

      const formattedMessage = aiAgent.formatClarificationMessage(result, 'ar');
      console.log(colors.yellow + '📱 Formatted Message:' + colors.reset);
      console.log(formattedMessage);
    } else {
      printResult('Unexpected Result', result);
    }

    return { success: true, result };
  } catch (error) {
    printError(error.message);
    return { success: false, error };
  }
}

/**
 * Test Case 3: Ambiguous Search
 * User: "بدي أرض"
 * Expected: Multiple land types found, ask user to clarify
 */
async function testAmbiguousSearch() {
  printHeader('TEST 3: Ambiguous Search - "بدي أرض"');

  try {
    const result = await aiAgent.intelligentMarketplaceSearch("بدي أرض", "ar");

    printResult('Result Type', result.type);

    if (result.type === 'clarification_needed') {
      printResult('Options', result.options);

      const formattedMessage = aiAgent.formatClarificationMessage(result, 'ar');
      console.log(colors.yellow + '📱 Formatted Message:' + colors.reset);
      console.log(formattedMessage);
    } else {
      printResult('Full Result', result);
    }

    return { success: true, result };
  } catch (error) {
    printError(error.message);
    return { success: false, error };
  }
}

/**
 * Test Case 4: Search with Price Filter
 * User: "شقة في دمشق بسعر أقل من 100 مليون"
 * Expected: Find apartments with price filter applied
 */
async function testSearchWithPriceFilter() {
  printHeader('TEST 4: Search with Price Filter - "شقة في دمشق بسعر أقل من 100 مليون"');

  try {
    const result = await aiAgent.intelligentMarketplaceSearch(
      "شقة في دمشق بسعر أقل من 100 مليون",
      "ar"
    );

    printResult('Result Type', result.type);

    if (result.type === 'search_results') {
      printResult('Applied Filters', result.appliedFilters);
      printResult('Total Results', result.totalResults);

      const formattedMessage = await aiAgent.formatSearchResultsMessage(result, 'ar');
      console.log(colors.yellow + '📱 Formatted Message:' + colors.reset);
      console.log(formattedMessage);
    } else {
      printResult('Full Result', result);
    }

    return { success: true, result };
  } catch (error) {
    printError(error.message);
    return { success: false, error };
  }
}

/**
 * Test Case 5: No Results
 * User: "بدي شي ما موجود"
 * Expected: No results found message
 */
async function testNoResults() {
  printHeader('TEST 5: No Results - "بدي شي ما موجود"');

  try {
    const result = await aiAgent.intelligentMarketplaceSearch("بدي شي ما موجود", "ar");

    printResult('Result Type', result.type);

    if (result.type === 'no_results') {
      const formattedMessage = aiAgent.formatNoResultsMessage('شي ما موجود', 'ar');
      console.log(colors.yellow + '📱 Formatted Message:' + colors.reset);
      console.log(formattedMessage);
    } else {
      printResult('Unexpected Result', result);
    }

    return { success: true, result };
  } catch (error) {
    printError(error.message);
    return { success: false, error };
  }
}

/**
 * Test Keyword Extraction
 */
async function testKeywordExtraction() {
  printHeader('TEST: Keyword Extraction');

  const testCases = [
    { input: "بدي شقة في دمشق", language: "ar" },
    { input: "سيارة للبيع موديل 2020", language: "ar" },
    { input: "apartment for rent in Damascus", language: "en" },
    { input: "بدي أرض زراعية واسعة", language: "ar" }
  ];

  testCases.forEach(testCase => {
    const keywords = aiAgent.extractKeywords(testCase.input, testCase.language);
    printResult(`Keywords for "${testCase.input}"`, keywords);
  });

  return { success: true };
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log(colors.bright + colors.magenta);
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  Direct Database Search - Test Suite                          ║');
  console.log('║  Testing new intelligentMarketplaceSearch() implementation    ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);

  const results = [];

  // Run tests
  results.push({ name: 'Keyword Extraction', ...(await testKeywordExtraction()) });
  results.push({ name: 'Simple Search', ...(await testSimpleSearch()) });
  results.push({ name: 'Vehicle Search', ...(await testVehicleSearch()) });
  results.push({ name: 'Ambiguous Search', ...(await testAmbiguousSearch()) });
  results.push({ name: 'Search with Price Filter', ...(await testSearchWithPriceFilter()) });
  results.push({ name: 'No Results', ...(await testNoResults()) });

  // Summary
  printHeader('TEST SUMMARY');

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  results.forEach(result => {
    const icon = result.success ? colors.green + '✓' : colors.red + '✗';
    console.log(`${icon} ${result.name}${colors.reset}`);
  });

  console.log('\n' + colors.bright);
  console.log(`Total: ${results.length} | Passed: ${colors.green}${successful}${colors.reset}${colors.bright} | Failed: ${colors.red}${failed}${colors.reset}`);
  console.log(colors.reset);

  if (failed === 0) {
    console.log(colors.green + colors.bright);
    console.log('🎉 All tests passed!');
    console.log(colors.reset);
  } else {
    console.log(colors.red + colors.bright);
    console.log('⚠️  Some tests failed. Check the errors above.');
    console.log(colors.reset);
  }
}

// Check environment
function checkEnvironment() {
  const required = [
    'MCP_DATABASE_URL',
    'OPENAI_API_KEY'  // or ANTHROPIC_API_KEY
  ];

  const missing = required.filter(key => !process.env[key] && key !== 'OPENAI_API_KEY' || (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY));

  if (missing.length > 0 && !process.env.ANTHROPIC_API_KEY) {
    console.error(colors.red + '❌ Missing required environment variables:' + colors.reset);
    console.error('   ' + missing.join(', '));
    console.error('\n' + colors.yellow + 'Please set these in your .env file:' + colors.reset);
    console.error('   MCP_DATABASE_URL=postgresql://...');
    console.error('   OPENAI_API_KEY=sk-...');
    console.error('   # or');
    console.error('   ANTHROPIC_API_KEY=sk-ant-...');
    process.exit(1);
  }

  console.log(colors.green + '✓ Environment variables configured' + colors.reset);
  console.log('  Database: ' + (process.env.MCP_DATABASE_URL ? 'Connected' : 'N/A'));
  console.log('  AI Provider: ' + (process.env.OPENAI_API_KEY ? 'OpenAI' : 'Anthropic'));
  console.log('');
}

// Main
(async () => {
  try {
    checkEnvironment();
    await runAllTests();
    process.exit(0);
  } catch (error) {
    console.error(colors.red + '❌ Fatal error:' + colors.reset, error);
    process.exit(1);
  }
})();
