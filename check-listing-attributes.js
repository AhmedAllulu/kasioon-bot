const db = require('./src/config/database');

(async () => {
  await db.connect();

  console.log('🔍 Checking listing_attributes structure...\n');

  // Check structure
  const structure = await db.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'listing_attributes'
    ORDER BY ordinal_position
  `);

  console.log('📊 listing_attributes columns:');
  structure.rows.forEach(col => {
    console.log(`  - ${col.column_name}: ${col.data_type}`);
  });

  // Get sample attributes
  console.log('\n📋 Sample listing attributes:');
  const sample = await db.query(`
    SELECT id, slug, name_ar, name_en, type, unit_ar, unit_en, is_searchable, is_active
    FROM listing_attributes
    WHERE is_active = true
    ORDER BY slug
    LIMIT 20
  `);

  sample.rows.forEach(attr => {
    console.log(`\n${attr.name_ar} (${attr.slug})`);
    console.log(`  Type: ${attr.type}`);
    console.log(`  Unit AR: ${attr.unit_ar ? attr.unit_ar.join(', ') : 'none'}`);
    console.log(`  Unit EN: ${attr.unit_en ? attr.unit_en.join(', ') : 'none'}`);
    console.log(`  Searchable: ${attr.is_searchable || false}`);
  });

  // Count by type
  const byType = await db.query(`
    SELECT type, COUNT(*) as count
    FROM listing_attributes
    GROUP BY type
    ORDER BY count DESC
  `);

  console.log('\n📈 Attributes by type:');
  byType.rows.forEach(row => {
    console.log(`  - ${row.type}: ${row.count}`);
  });

  // Total count
  const total = await db.query('SELECT COUNT(*) FROM listing_attributes');
  console.log(`\n✅ Total attributes: ${total.rows[0].count}`);

  process.exit(0);
})();
