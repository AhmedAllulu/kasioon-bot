const https = require('https');

async function testSearch(query, description) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ query, language: 'ar' });

    const options = {
      hostname: 'localhost',
      port: 3355,
      path: '/api/search',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      rejectUnauthorized: false
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ success: true, data: JSON.parse(data), description });
        } catch (error) {
          resolve({ success: false, error: error.message, description });
        }
      });
    });

    req.on('error', (error) => resolve({ success: false, error: error.message, description }));
    req.write(postData);
    req.end();
  });
}

(async () => {
  console.log('🧪 Testing Smart Filter Logic\n');
  console.log('='.repeat(70));

  const tests = [
    { query: 'سيارة', description: 'Search without location/transaction (should search ALL cars)' },
    { query: 'سيارة في إدلب', description: 'Search with location but no transaction type' },
    { query: 'سيارة للبيع', description: 'Search with transaction type but no location' },
    { query: 'سيارة للبيع في إدلب', description: 'Search with BOTH location and transaction type' },
    { query: 'طربيزات', description: 'Search tables (no filters)' },
    { query: 'شقة', description: 'Search apartment (no filters)' }
  ];

  for (const test of tests) {
    console.log(`\n📋 Test: ${test.description}`);
    console.log(`   Query: "${test.query}"`);
    console.log('-'.repeat(70));

    const result = await testSearch(test.query, test.description);

    if (result.success) {
      const response = result.data;
      const listings = response.data?.listings || response.data || [];
      const parsed = response.data?.query?.parsed;

      console.log(`   ✅ Success - ${listings.length} results`);
      console.log(`   Category: ${parsed?.category?.name || parsed?.category?.name_ar || 'none'}`);
      console.log(`   Location: ${parsed?.location?.name_ar || 'none'} (conf: ${parsed?.location?.confidence || 'N/A'})`);
      console.log(`   Transaction: ${parsed?.transactionType?.slug || 'none'} (conf: ${parsed?.transactionType?.confidence || 'N/A'})`);

      // Show applied filters
      const params = response.data?.searchParams || {};
      const appliedFilters = [];
      if (params.categoryId) appliedFilters.push('category');
      if (params.cityId) appliedFilters.push('location');
      if (params.transactionTypeSlug) appliedFilters.push('transaction');
      console.log(`   Applied filters: ${appliedFilters.length > 0 ? appliedFilters.join(', ') : 'NONE (searching all)'}`);

      if (listings.length > 0) {
        console.log(`   First result: ${listings[0].title?.substring(0, 60)}`);
      }
    } else {
      console.log(`   ❌ Error: ${result.error}`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ Tests completed!\n');
})();
