const database = require('./src/config/database');

async function checkCarDetails() {
  try {
    await database.connect();

    console.log('🚗 Checking car listing details...\n');

    const carDetails = await database.query(`
      SELECT
        l.id,
        l.title,
        l.status,
        c.name_ar as category,
        c.slug as category_slug,
        ct.name_ar as city,
        ct.name_en as city_en,
        tt.name_ar as transaction_type,
        tt.slug as transaction_type_slug
      FROM listings l
      JOIN categories c ON l.category_id = c.id
      JOIN cities ct ON l.city_id = ct.id
      LEFT JOIN transaction_types tt ON l.transaction_type_id = tt.id
      WHERE l.title ILIKE '%سيارة%فيرنا%'
    `);

    if (carDetails.rows.length > 0) {
      const car = carDetails.rows[0];
      console.log('Car Listing Found:');
      console.log(`  Title: ${car.title}`);
      console.log(`  Status: ${car.status}`);
      console.log(`  Category: ${car.category} (${car.category_slug})`);
      console.log(`  City: ${car.city} (${car.city_en})`);
      console.log(`  Transaction Type: ${car.transaction_type} (${car.transaction_type_slug})`);
    } else {
      console.log('Car listing not found!');
    }

    // Check if "السيارات" category has the keyword "سيارة"
    console.log('\n📦 Checking car category keywords:');
    const carCategory = await database.query(`
      SELECT c.id, c.name_ar, c.slug, ce.keywords_ar
      FROM categories c
      LEFT JOIN category_embeddings ce ON c.id = ce.category_id
      WHERE c.slug = 'cars' OR c.name_ar = 'السيارات'
    `);

    if (carCategory.rows.length > 0) {
      const cat = carCategory.rows[0];
      console.log(`  Category: ${cat.name_ar} (${cat.slug})`);
      console.log(`  Keywords: ${cat.keywords_ar || 'NONE'}`);
    } else {
      console.log('  Car category not found in database!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

checkCarDetails();
