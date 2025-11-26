const db = require('./src/config/database');

(async () => {
  await db.connect();

  console.log('🔍 Checking database tables...\n');

  const tables = await db.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);

  console.log('📊 Available tables:');
  tables.rows.forEach((row, idx) => {
    console.log(`  ${idx + 1}. ${row.table_name}`);
  });

  // Check for attribute-related tables
  console.log('\n🔎 Attribute-related tables:');
  const attrTables = tables.rows.filter(row =>
    row.table_name.includes('attr') ||
    row.table_name.includes('filter') ||
    row.table_name.includes('field') ||
    row.table_name.includes('property')
  );

  if (attrTables.length > 0) {
    attrTables.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
  } else {
    console.log('  (No attribute-related tables found)');
  }

  // Check listings table structure for attributes
  console.log('\n📋 Listings table columns (looking for attributes):');
  const listingCols = await db.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'listings'
    ORDER BY ordinal_position
  `);

  listingCols.rows.forEach(col => {
    console.log(`  - ${col.column_name}: ${col.data_type}`);
  });

  process.exit(0);
})();
