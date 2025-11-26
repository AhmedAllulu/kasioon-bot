const database = require('./src/config/database');

async function checkEmbeddings() {
  try {
    await database.connect();

    console.log('🔍 Checking embedding dimensions in database...\n');

    // Check vector column type
    const columnInfo = await database.query(`
      SELECT
        column_name,
        data_type,
        udt_name
      FROM information_schema.columns
      WHERE table_name = 'listing_embeddings'
        AND column_name LIKE '%embedding%'
    `);

    console.log('📊 Column definitions:');
    columnInfo.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.udt_name})`);
    });

    // Get actual vector dimensions from a sample
    const sampleEmbedding = await database.query(`
      SELECT
        listing_id,
        vector_dims(embedding_ar) as ar_dims,
        vector_dims(embedding_en) as en_dims
      FROM listing_embeddings
      WHERE embedding_ar IS NOT NULL
      LIMIT 1
    `);

    console.log('\n📏 Sample embedding dimensions:');
    if (sampleEmbedding.rows.length > 0) {
      console.log(`  - Arabic embedding: ${sampleEmbedding.rows[0].ar_dims} dimensions`);
      console.log(`  - English embedding: ${sampleEmbedding.rows[0].en_dims} dimensions`);
    }

    // Check if car listing has embeddings
    const carListing = await database.query(`
      SELECT l.id, l.title,
             CASE WHEN le.embedding_ar IS NOT NULL THEN 'YES' ELSE 'NO' END as has_ar_embedding,
             CASE WHEN le.embedding_en IS NOT NULL THEN 'YES' ELSE 'NO' END as has_en_embedding
      FROM listings l
      LEFT JOIN listing_embeddings le ON l.id = le.listing_id
      WHERE l.title ILIKE '%سيارة%فيرنا%'
    `);

    console.log('\n🚗 Car listing embedding status:');
    if (carListing.rows.length > 0) {
      const car = carListing.rows[0];
      console.log(`  - ID: ${car.id}`);
      console.log(`  - Title: ${car.title}`);
      console.log(`  - Has Arabic embedding: ${car.has_ar_embedding}`);
      console.log(`  - Has English embedding: ${car.has_en_embedding}`);
    } else {
      console.log('  - Car listing not found!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

checkEmbeddings();
