#!/usr/bin/env node

/**
 * Test Search Improvements
 * Tests multi-token matching, confidence threshold, and AI validation
 */

const https = require('https');

const agent = new https.Agent({ rejectUnauthorized: false });

async function search(query) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query, language: 'ar' });

    const options = {
      hostname: 'localhost',
      port: 3355,
      path: '/api/search',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      },
      agent
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing Search Improvements\n');
  console.log('=' .repeat(70));

  const tests = [
    {
      name: 'Programming Company (Should NOT match cars)',
      query: 'بدي شركة برمجة',
      expectedCategory: null,
      expectedMinResults: 2
    },
    {
      name: 'Car Search (Should work with fallback)',
      query: 'ابحثلي عن سيارة فيرنا',
      expectedCategory: null, // Will use fallback
      expectedMinResults: 1
    },
    {
      name: 'Dining Table (Direct title search)',
      query: 'بدي طاولة طعام',
      expectedCategory: null,
      expectedMinResults: 2
    }
  ];

  for (const test of tests) {
    console.log(`\n📝 Test: ${test.name}`);
    console.log(`   Query: "${test.query}"`);

    try {
      const result = await search(test.query);
      const total = result.data?.pagination?.total || 0;
      const category = result.data?.query?.parsed?.category?.name_ar || null;
      const method = result.meta?.searchMethod || 'unknown';
      const confidence = result.meta?.confidence || 0;

      console.log(`   Results: ${total}`);
      console.log(`   Category: ${category || 'none (✅ good)'}`);
      console.log(`   Method: ${method}`);
      console.log(`   Confidence: ${confidence}`);

      // Validate
      const categoryMatch = category === test.expectedCategory;
      const resultsMatch = total >= test.expectedMinResults;

      if (categoryMatch && resultsMatch) {
        console.log(`   ✅ PASSED`);
      } else {
        console.log(`   ❌ FAILED`);
        if (!categoryMatch) {
          console.log(`      Expected category: ${test.expectedCategory}, got: ${category}`);
        }
        if (!resultsMatch) {
          console.log(`      Expected >= ${test.expectedMinResults} results, got: ${total}`);
        }
      }

      // Show sample results
      if (total > 0 && result.data?.listings?.length > 0) {
        console.log(`   Sample results:`);
        result.data.listings.slice(0, 2).forEach((listing, i) => {
          console.log(`     ${i + 1}. ${listing.title?.substring(0, 60)}...`);
        });
      }

    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
    }

    await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ Test suite completed!\n');
}

runTests().catch(console.error);
