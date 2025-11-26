const database = require('./src/config/database');

async function investigate() {
  try {
    // Connect to database
    await database.connect();
    console.log('🔍 Investigating listings and categories...\n');

    // 1. Check vehicle categories
    console.log('1️⃣  Checking vehicle/car categories:');
    const vehicleCategories = await database.query(`
      SELECT c.id, c.name_ar, c.name_en, c.slug, COUNT(l.id) as listing_count
      FROM categories c
      LEFT JOIN listings l ON c.id = l.category_id AND l.status = 'active'
      WHERE c.name_ar LIKE '%سيار%'
         OR c.name_ar LIKE '%مركب%'
         OR c.name_en ILIKE '%vehicle%'
         OR c.name_en ILIKE '%auto%'
         OR c.slug LIKE '%car%'
         OR c.slug LIKE '%vehicle%'
      GROUP BY c.id, c.name_ar, c.name_en, c.slug
      ORDER BY listing_count DESC
    `);
    console.log(`Found ${vehicleCategories.rows.length} vehicle categories:`);
    vehicleCategories.rows.forEach(row => {
      console.log(`  - ${row.name_ar} (${row.slug}): ${row.listing_count} listings`);
    });

    // 2. Check active listings
    console.log('\n2️⃣  Sample of active listings:');
    const activeListings = await database.query(`
      SELECT l.id, l.title, c.name_ar as category, ct.name_ar as city, l.status
      FROM listings l
      JOIN categories c ON l.category_id = c.id
      JOIN cities ct ON l.city_id = ct.id
      WHERE l.status = 'active'
      ORDER BY l.created_at DESC
      LIMIT 20
    `);
    console.log(`Found ${activeListings.rows.length} active listings:`);
    activeListings.rows.forEach(row => {
      console.log(`  - ${row.title.substring(0, 50)} | ${row.category} | ${row.city}`);
    });

    // 3. Check embeddings
    console.log('\n3️⃣  Checking embeddings:');
    const embeddings = await database.query(`
      SELECT COUNT(*) as total_embeddings,
             COUNT(embedding_ar) as ar_embeddings,
             COUNT(embedding_en) as en_embeddings
      FROM listing_embeddings
    `);
    console.log(`  - Total embedding records: ${embeddings.rows[0].total_embeddings}`);
    console.log(`  - Arabic embeddings: ${embeddings.rows[0].ar_embeddings}`);
    console.log(`  - English embeddings: ${embeddings.rows[0].en_embeddings}`);

    // 4. Check listings in Idlib
    console.log('\n4️⃣  Checking listings in Idlib:');
    const idlibCity = await database.query(`
      SELECT id, name_ar, name_en FROM cities
      WHERE name_ar LIKE '%ادلب%' OR name_ar LIKE '%إدلب%'
    `);
    if (idlibCity.rows.length > 0) {
      const cityId = idlibCity.rows[0].id;
      console.log(`  - Found city: ${idlibCity.rows[0].name_ar} (${idlibCity.rows[0].name_en})`);

      const idlibListings = await database.query(`
        SELECT COUNT(*) as count
        FROM listings
        WHERE city_id = $1 AND status = 'active'
      `, [cityId]);
      console.log(`  - Active listings in Idlib: ${idlibListings.rows[0].count}`);
    } else {
      console.log('  - Idlib city not found!');
    }

    // 5. Test vector search with car query
    console.log('\n5️⃣  Testing vector search for "سيارة":');
    const openAIService = require('./src/services/ai/OpenAIService');
    const embedding = await openAIService.createEmbedding('سيارة في إدلب');
    const embeddingStr = `[${embedding.join(',')}]`;

    const vectorResults = await database.query(`
      SELECT l.id, l.title, c.name_ar as category,
             1 - (le.embedding_ar <=> $1::vector) as similarity_score
      FROM listings l
      JOIN listing_embeddings le ON l.id = le.listing_id
      JOIN categories c ON l.category_id = c.id
      WHERE l.status = 'active'
        AND le.embedding_ar IS NOT NULL
      ORDER BY similarity_score DESC
      LIMIT 10
    `, [embeddingStr]);

    console.log(`  - Vector search returned ${vectorResults.rows.length} results:`);
    vectorResults.rows.forEach(row => {
      console.log(`    ${(row.similarity_score * 100).toFixed(2)}% - ${row.title.substring(0, 50)} (${row.category})`);
    });

    // 6. Test text search
    console.log('\n6️⃣  Testing text search for "سيارة":');
    const textResults = await database.query(`
      SELECT l.id, l.title, c.name_ar as category
      FROM listings l
      JOIN categories c ON l.category_id = c.id
      WHERE l.status = 'active'
        AND (l.title ILIKE '%سيارة%' OR l.description ILIKE '%سيارة%')
      LIMIT 10
    `);
    console.log(`  - Text search returned ${textResults.rows.length} results:`);
    textResults.rows.forEach(row => {
      console.log(`    - ${row.title.substring(0, 50)} (${row.category})`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

investigate();
