const db = require('./src/config/database');

(async () => {
  await db.connect();

  // Check if cars category has keywords
  const result = await db.query(`
    SELECT c.name_ar, c.slug, ce.keywords_ar
    FROM categories c
    JOIN category_embeddings ce ON c.id = ce.category_id
    WHERE c.slug = 'cars'
  `);

  if (result.rows.length > 0) {
    const row = result.rows[0];
    console.log('Cars category in DB:');
    console.log(`  Name: ${row.name_ar}`);
    console.log(`  Keywords: ${row.keywords_ar.join(', ')}`);
    console.log(`  Includes 'سيارة'? ${row.keywords_ar.includes('سيارة') ? 'YES ✅' : 'NO ❌'}`);
  } else {
    console.log('Cars category not found!');
  }

  // Check what the hot cache query returns
  console.log('\nChecking hot cache query format:');
  const hotCacheQuery = await db.query(`
    SELECT
      c.id, c.name_ar, c.name_en, c.slug, c.parent_id, c.level,
      ce.keywords_ar, ce.keywords_en
    FROM categories c
    LEFT JOIN category_embeddings ce ON c.id = ce.category_id
    WHERE c.slug = 'cars'
  `);

  if (hotCacheQuery.rows.length > 0) {
    console.log('Hot cache format:', JSON.stringify(hotCacheQuery.rows[0], null, 2));
  }

  process.exit(0);
})();
