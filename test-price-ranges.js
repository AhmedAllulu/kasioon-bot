const DatabaseMatcher = require('./src/services/mcp/DatabaseMatcher');
const db = require('./src/config/database');

async function testPriceExtraction() {
  await db.connect();
  await DatabaseMatcher.initializeHotCache();

  console.log('🧪 Testing Price & Area Range Extraction\n');
  console.log('='.repeat(70));

  const testCases = [
    // Price ranges
    'شقة بسعر من 100000 إلى 200000 ليرة',
    'سيارة بين 5000 و 10000 دولار',
    'محل 50-100 مليون',
    'أرض من 2 الى 3 مليون',

    // Single prices
    'شقة بسعر 150000 ليرة',
    'سيارة 8000 دولار',

    // Area ranges
    'شقة مساحة من 100 إلى 150 متر',
    'أرض بين 500 و 1000 متر',
    'محل 80-120 م²',

    // Single areas
    'شقة 120 متر',
    'أرض 500 م²'
  ];

  for (const query of testCases) {
    const attributes = DatabaseMatcher.extractNumericAttributes(query);

    console.log(`\n📝 Query: "${query}"`);

    if (attributes.price) {
      if (attributes.price.type === 'range') {
        console.log(`   💰 Price Range: ${attributes.price.min} - ${attributes.price.max}`);
      } else {
        console.log(`   💰 Price: ${attributes.price.value}`);
      }
    }

    if (attributes.area) {
      if (attributes.area.type === 'range') {
        console.log(`   📐 Area Range: ${attributes.area.min} - ${attributes.area.max}`);
      } else {
        console.log(`   📐 Area: ${attributes.area.value}`);
      }
    }

    if (!attributes.price && !attributes.area) {
      console.log('   ⚠️  No price or area extracted');
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ Tests completed!\n');
  process.exit(0);
}

testPriceExtraction().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
