#!/usr/bin/env node

/**
 * Test script for MCP Database-First Smart Architecture
 * Run: node scripts/test-mcp-parser.js
 */

require('dotenv').config();

const database = require('../src/config/database');
const redisCache = require('../src/config/redis');
const openAIConfig = require('../src/config/openai');
const mcpAgent = require('../src/services/mcp/MCPAgent');
const logger = require('../src/utils/logger');

const testQueries = [
  { query: 'سيارة تويوتا للبيع في دمشق', description: 'Car sale in Damascus' },
  { query: 'شقة للإيجار في حلب', description: 'Apartment rent in Aleppo' },
  { query: 'بدي موبايل سامسونج رخيص', description: 'Cheap Samsung phone' },
  { query: 'بيت كبير مع حديقة في حمص', description: 'Big house with garden in Homs' },
  { query: 'وظيفة مبرمج في دمشق', description: 'Programming job in Damascus' }
];

async function runTests() {
  console.log('🚀 Starting MCP Parser Tests\n');
  console.log('=' .repeat(80));

  try {
    // 1. Connect to services
    console.log('\n📡 Connecting to services...');
    await database.connect();
    console.log('✅ PostgreSQL connected');

    await redisCache.connect();
    console.log('✅ Redis connected');

    openAIConfig.initialize();
    console.log('✅ OpenAI initialized');

    // 2. Initialize MCP Agent
    console.log('\n🔧 Initializing MCP Agent...');
    await mcpAgent.initialize();
    console.log('✅ MCP Agent initialized with hot cache');

    // 3. Health check
    console.log('\n🏥 Running health check...');
    const health = await mcpAgent.healthCheck();
    console.log(JSON.stringify(health, null, 2));

    // 4. Run test queries
    console.log('\n📝 Testing queries...\n');
    console.log('=' .repeat(80));

    const results = [];

    for (const { query, description } of testQueries) {
      console.log(`\n🔍 Testing: ${description}`);
      console.log(`   Query: "${query}"`);

      try {
        const startTime = Date.now();
        const result = await mcpAgent.processQuery(query, { language: 'ar', source: 'test' });
        const duration = Date.now() - startTime;

        console.log(`   ✅ Tier ${result.tier} - ${result.method}`);
        console.log(`   Category: ${result.category?.name || 'N/A'} (${result.category?.slug || 'N/A'})`);
        console.log(`   Location: ${result.location?.name || 'N/A'}`);
        console.log(`   Transaction: ${result.transactionType || 'N/A'}`);
        console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
        console.log(`   Time: ${duration}ms`);
        console.log(`   AI Tokens: ${result.aiTokens || 0}`);

        results.push({
          query,
          success: true,
          tier: result.tier,
          confidence: result.confidence,
          duration,
          aiTokens: result.aiTokens || 0
        });
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        results.push({
          query,
          success: false,
          error: error.message
        });
      }
    }

    // 5. Show statistics
    console.log('\n\n📊 Parser Statistics');
    console.log('=' .repeat(80));
    const stats = mcpAgent.getStats();
    console.log(JSON.stringify(stats, null, 2));

    // 6. Summary
    console.log('\n\n📈 Test Summary');
    console.log('=' .repeat(80));

    const successful = results.filter(r => r.success).length;
    const avgDuration = results.filter(r => r.success).reduce((sum, r) => sum + r.duration, 0) / successful;
    const totalAiTokens = results.filter(r => r.success).reduce((sum, r) => sum + r.aiTokens, 0);
    const tierDistribution = results.filter(r => r.success).reduce((acc, r) => {
      acc[`tier${r.tier}`] = (acc[`tier${r.tier}`] || 0) + 1;
      return acc;
    }, {});

    console.log(`Total Queries: ${results.length}`);
    console.log(`Successful: ${successful}`);
    console.log(`Failed: ${results.length - successful}`);
    console.log(`Average Duration: ${avgDuration.toFixed(0)}ms`);
    console.log(`Total AI Tokens: ${totalAiTokens}`);
    console.log(`Tier Distribution:`, tierDistribution);

    // Calculate estimated cost
    const estimatedCost = (
      (tierDistribution.tier2 || 0) * 0.0001 +
      (tierDistribution.tier3 || 0) * 0.0005 +
      (tierDistribution.tier4 || 0) * 0.003
    );
    console.log(`Estimated Cost: $${estimatedCost.toFixed(4)}`);

    const oldCost = results.length * 0.008;
    const savings = ((oldCost - estimatedCost) / oldCost * 100).toFixed(1);
    console.log(`Old Cost (100% AI): $${oldCost.toFixed(4)}`);
    console.log(`Cost Savings: ${savings}%`);

    console.log('\n✅ All tests completed!');
    console.log('=' .repeat(80));

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Cleanup
    await database.close();
    await redisCache.close();
    process.exit(0);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
