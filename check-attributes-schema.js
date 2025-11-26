const db = require('./src/config/database');

(async () => {
  await db.connect();

  console.log('🔍 Checking attributes schema...\n');

  // Check attributes table structure
  const attrTable = await db.query(`
    SELECT column_name, data_type, udt_name
    FROM information_schema.columns
    WHERE table_name = 'attributes'
    ORDER BY ordinal_position
  `);

  console.log('📊 Attributes table columns:');
  attrTable.rows.forEach(col => {
    console.log(`  - ${col.column_name}: ${col.data_type} (${col.udt_name})`);
  });

  // Get sample attributes
  console.log('\n📋 Sample attributes:');
  const sampleAttrs = await db.query(`
    SELECT id, slug, name_ar, name_en, type, unit, is_searchable, is_filterable
    FROM attributes
    WHERE is_searchable = true OR is_filterable = true
    ORDER BY slug
    LIMIT 20
  `);

  sampleAttrs.rows.forEach(attr => {
    console.log(`\n${attr.name_ar} (${attr.slug})`);
    console.log(`  Type: ${attr.type}`);
    console.log(`  Unit: ${attr.unit || 'none'}`);
    console.log(`  Searchable: ${attr.is_searchable}`);
    console.log(`  Filterable: ${attr.is_filterable}`);
  });

  // Count total attributes
  const total = await db.query('SELECT COUNT(*) FROM attributes');
  console.log(`\n📈 Total attributes: ${total.rows[0].count}`);

  // Count by type
  const byType = await db.query(`
    SELECT type, COUNT(*) as count
    FROM attributes
    GROUP BY type
    ORDER BY count DESC
  `);

  console.log('\n📊 Attributes by type:');
  byType.rows.forEach(row => {
    console.log(`  - ${row.type}: ${row.count}`);
  });

  process.exit(0);
})();
