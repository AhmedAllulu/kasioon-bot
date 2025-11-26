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
  console.log('🔍 Testing: "ابحث عن شركة برمجة"\n');

  try {
    const response = await testSearch('ابحث عن شركة برمجة');

    console.log('📊 Search Response:');
    console.log('Status:', response.success ? 'SUCCESS ✅' : 'FAILED ❌');

    const parsed = response.data?.query?.parsed;
    if (parsed) {
      console.log('\n🔎 Parsed Query:');
      console.log('  Category:', parsed.category?.name_ar || parsed.category?.name || 'none');
      console.log('  Location:', parsed.location?.name_ar || 'none');
      console.log('  Transaction:', parsed.transactionType?.slug || 'none');
      console.log('  Attributes:', JSON.stringify(parsed.attributes || {}, null, 2));
      console.log('  Keywords:', parsed.keywords?.join(', ') || 'none');
    }

    const listings = response.data?.listings || response.data || [];
    console.log(`\n📋 Results: ${listings.length} listings found`);

    if (listings.length > 0) {
      console.log('\n✨ First 3 results:');
      listings.slice(0, 3).forEach((listing, idx) => {
        console.log(`\n${idx + 1}. ${listing.title}`);
        console.log(`   Category: ${listing.category?.name || 'N/A'}`);
        console.log(`   Location: ${listing.location?.city || 'N/A'}`);
        if (listing.price) {
          console.log(`   Price: ${listing.priceFormatted || `${listing.price} ${listing.currency || 'SYP'}`}`);
        } else {
          console.log(`   Price: غير محدد`);
        }
      });
    }

    // Show full attributes if extracted
    if (parsed?.attributes && Object.keys(parsed.attributes).length > 0) {
      console.log('\n⚠️  Extracted attributes (check if price range is handled):');
      console.log(JSON.stringify(parsed.attributes, null, 2));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
})();
