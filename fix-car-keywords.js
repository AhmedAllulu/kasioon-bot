const database = require('./src/config/database');

async function fixCarKeywords() {
  try {
    await database.connect();

    console.log('🔧 Fixing car category keywords...\n');

    // Update car category keywords
    await database.query(`
      UPDATE category_embeddings
      SET keywords_ar = ARRAY['سيارة', 'سيارات', 'car', 'cars', 'vehicle', 'مركبة', 'مركبات', 'عربية', 'عربيات'],
          keywords_en = ARRAY['car', 'cars', 'vehicle', 'vehicles', 'automobile', 'automobiles', 'auto']
      WHERE category_id = (SELECT id FROM categories WHERE slug = 'cars')
    `);

    console.log('✅ Updated cars category keywords');

    // Verify
    const result = await database.query(`
      SELECT c.name_ar, ce.keywords_ar, ce.keywords_en
      FROM categories c
      JOIN category_embeddings ce ON c.id = ce.category_id
      WHERE c.slug = 'cars'
    `);

    if (result.rows.length > 0) {
      const cat = result.rows[0];
      console.log(`\n📦 ${cat.name_ar}:`);
      console.log(`  Arabic keywords: ${cat.keywords_ar.join(', ')}`);
      console.log(`  English keywords: ${cat.keywords_en.join(', ')}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

fixCarKeywords();
