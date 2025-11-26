const https = require('https');

// Use a slightly different query to avoid cache
const postData = JSON.stringify({
  query: 'سيارة في إدلب للبيع',
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
  rejectUnauthorized: false
};

console.log('🔍 Testing search: "سيارة في إدلب للبيع"');
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
      console.log(`Status: ${res.statusCode}`);
      console.log(`Results: ${response.data?.length || 0} listings found`);
      console.log(`Response time: ${response.meta?.responseTime}ms`);
      console.log(`Search method: ${response.meta?.searchMethod}`);
      console.log(`Cached: ${response.meta?.cached ? 'YES' : 'NO'}`);

      if (response.data && response.data.length > 0) {
        console.log('\n📋 Listings:');
        response.data.slice(0, 5).forEach((listing, index) => {
          console.log(`\n${index + 1}. ${listing.title?.substring(0, 60)}`);
          console.log(`   Category: ${listing.category?.name || 'N/A'}`);
          console.log(`   Location: ${listing.location?.city || 'N/A'}`);
          if (listing.price || listing.priceFormatted) {
            console.log(`   Price: ${listing.priceFormatted || `${listing.price} ${listing.currency || 'SYP'}`}`);
          }
        });
      } else {
        console.log('\n⚠️  No results found');
      }

      console.log('\n📊 Full response structure:');
      console.log(JSON.stringify(response, null, 2).substring(0, 1000));
    } catch (error) {
      console.error('❌ Error parsing response:', error.message);
      console.log('Raw response:', data.substring(0, 500));
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request error:', error.message);
});

req.write(postData);
req.end();
