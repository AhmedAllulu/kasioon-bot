const db = require('./src/config/database');

async function main() {
  console.log('🧪 Testing Car Search Fallback Logic\n');

  await db.connect();

  // 1. Count total active listings
  const totalResult = await db.query(
    `SELECT COUNT(*) as total FROM listings WHERE status = 'active'`
  );
  console.log(`📊 Total active listings: ${totalResult.rows[0].total}\n`);

  // 2. Count car listings
  const carsResult = await db.query(`
    SELECT COUNT(*) as total
    FROM listings l
    JOIN categories c ON l.category_id = c.id
    WHERE l.status = 'active'
      AND (c.slug LIKE '%car%' OR c.slug LIKE '%سيار%' OR c.name_ar LIKE '%سيار%')
  `);
  console.log(`🚗 Car listings: ${carsResult.rows[0].total}\n`);

  // 3. Search for listings with "سيارة" in title (what fallback should find)
  const titleSearchResult = await db.query(`
    SELECT COUNT(*) as total
    FROM listings
    WHERE status = 'active'
      AND title ILIKE '%سيارة%'
  `);
  console.log(`📝 Listings with "سيارة" in title: ${titleSearchResult.rows[0].total}\n`);

  // 4. Show sample car listings
  const sampleCars = await db.query(`
    SELECT l.id, l.title, c.name_ar as category
    FROM listings l
    JOIN categories c ON l.category_id = c.id
    WHERE l.status = 'active'
      AND l.title ILIKE '%سيارة%'
    LIMIT 5
  `);

  console.log('📋 Sample car listings with "سيارة" in title:\n');
  sampleCars.rows.forEach((listing, i) => {
    console.log(`  ${i + 1}. ${listing.title}`);
    console.log(`     Category: ${listing.category}\n`);
  });

  // 5. Test the exact fallback search query
  console.log('🔍 Testing exact fallback search query (LIKE):\n');

  const searchPattern = '%سيارة%';
  const fallbackResult = await db.query(`
    SELECT COUNT(*) as total
    FROM listings l
    WHERE l.status = 'active'
      AND (
        l.title ILIKE $1
        OR l.description ILIKE $1
      )
  `, [searchPattern]);

  console.log(`   Found: ${fallbackResult.rows[0].total} listings\n`);

  process.exit(0);
}

process.on('unhandledRejection', (error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
