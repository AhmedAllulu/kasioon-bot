const https = require('https');

const postData = JSON.stringify({
  query: 'بدي سيارة في إدلب',
  language: 'ar'
});

const options = {
  hostname: 'localhost',
  port: 3355,
  path: '/api/search',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  },
  rejectUnauthorized: false // For self-signed cert
};

console.log('🔍 Testing search: "بدي سيارة في إدلب"');
console.log('─'.repeat(60));

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);

      console.log(`\n✅ Search completed!`);
      console.log(`Results: ${response.data?.length || 0} listings found`);
      console.log(`Response time: ${response.meta?.responseTime}ms`);
      console.log(`Search method: ${response.meta?.searchMethod}`);

      if (response.data && response.data.length > 0) {
        console.log('\n📋 Listings:');
        response.data.forEach((listing, index) => {
          console.log(`\n${index + 1}. ${listing.title}`);
          console.log(`   Category: ${listing.category?.name || 'N/A'}`);
          console.log(`   Location: ${listing.location?.city || 'N/A'}`);
          console.log(`   Transaction: ${listing.transactionType?.slug || listing.transactionType || 'N/A'}`);
          if (listing.price) {
            console.log(`   Price: ${listing.priceFormatted || `${listing.price} ${listing.currency || 'SYP'}`}`);
          } else {
            console.log(`   Price: غير محدد`);
          }
        });
      } else {
        console.log('\n⚠️  No results found');
        if (response.query?.parsed) {
          console.log('\nParsed query:');
          console.log(`  Category: ${response.query.parsed.category?.name_ar || 'none'}`);
          console.log(`  Location: ${response.query.parsed.location?.name_ar || 'none'}`);
          console.log(`  Transaction Type: ${response.query.parsed.transactionType || 'none'}`);
        }
      }
    } catch (error) {
      console.error('❌ Error parsing response:', error.message);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request error:', error.message);
});

req.write(postData);
req.end();
