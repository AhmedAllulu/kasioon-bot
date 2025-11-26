const https = require('https');

function testSearch(query) {
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
          resolve(JSON.parse(data));
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

(async () => {
  console.log('🔍 Testing: "سيارة في إدلب"\n');

  try {
    const response = await testSearch('سيارة في إدلب');

    console.log(`Status: ${response.success ? 'SUCCESS ✅' : 'FAILED ❌'}`);
    console.log(`Response time: ${response.data?.meta?.responseTime || response.meta?.responseTime}ms`);
    console.log(`Search method: ${response.data?.meta?.searchMethod || response.meta?.searchMethod}`);

    const listings = response.data?.listings || response.data || [];
    console.log(`Results: ${listings.length} listings\n`);

    if (response.data?.query?.parsed) {
      const parsed = response.data.query.parsed;
      console.log('📊 Query Parsing:');
      console.log(`  Category: ${parsed.category?.name || parsed.category?.name_ar || 'none'} (${parsed.category?.slug || 'none'})`);
      console.log(`  Location: ${parsed.location?.name_ar || 'none'}`);
      console.log(`  Transaction: ${parsed.transactionType || 'none'}`);
      console.log();
    }

    if (listings.length > 0) {
      console.log('📋 Listings found:');
      listings.slice(0, 3).forEach((listing, idx) => {
        console.log(`\n${idx + 1}. ${listing.title?.substring(0, 70)}`);
        console.log(`   Category: ${listing.category?.name || 'N/A'}`);
        console.log(`   Location: ${listing.location?.city || 'N/A'}`);
        if (listing.price) {
          console.log(`   Price: ${listing.priceFormatted || `${listing.price} ${listing.currency || 'SYP'}`}`);
        } else {
          console.log(`   Price: غير محدد`);
        }
      });
    } else {
      console.log('⚠️  No results found');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
})();
