const db = require('./src/config/database');

/**
 * Check keyword coverage across all categories
 */
async function main() {
  console.log('📊 Category Keywords Coverage Report\n');
  console.log('='.repeat(80));

  await db.connect();

  // 1. Overall Statistics
  console.log('\n📈 OVERALL STATISTICS:\n');

  const totalCategories = await db.query('SELECT COUNT(*) FROM categories');
  console.log(`   Total categories: ${totalCategories.rows[0].count}`);

  const withKeywords = await db.query(`
    SELECT COUNT(*)
    FROM category_embeddings ce
    WHERE keywords_ar IS NOT NULL
      AND array_length(keywords_ar, 1) > 0
  `);
  console.log(`   ✅ With keywords: ${withKeywords.rows[0].count}`);

  const withoutKeywords = await db.query(`
    SELECT COUNT(*)
    FROM categories c
    LEFT JOIN category_embeddings ce ON c.id = ce.category_id
    WHERE ce.keywords_ar IS NULL
       OR array_length(ce.keywords_ar, 1) IS NULL
       OR array_length(ce.keywords_ar, 1) = 0
  `);
  console.log(`   ❌ Without keywords: ${withoutKeywords.rows[0].count}`);

  const coverage = ((parseInt(withKeywords.rows[0].count) / parseInt(totalCategories.rows[0].count)) * 100).toFixed(1);
  console.log(`   📊 Coverage: ${coverage}%`);

  // 2. Top-Level Categories with Keywords
  console.log('\n\n🏆 TOP-LEVEL CATEGORIES (Root Categories):\n');

  const rootCategories = await db.query(`
    SELECT
      c.name_ar,
      c.name_en,
      c.slug,
      ce.keywords_ar,
      ce.keywords_en,
      CASE
        WHEN ce.keywords_ar IS NOT NULL AND array_length(ce.keywords_ar, 1) > 0
        THEN '✅'
        ELSE '❌'
      END as status
    FROM categories c
    LEFT JOIN category_embeddings ce ON c.id = ce.category_id
    WHERE c.parent_id IS NULL
    ORDER BY c.name_ar
    LIMIT 20
  `);

  rootCategories.rows.forEach((cat, idx) => {
    console.log(`   ${idx + 1}. ${cat.status} ${cat.name_ar} (${cat.name_en})`);
    if (cat.keywords_ar && cat.keywords_ar.length > 0) {
      console.log(`      📝 AR: ${cat.keywords_ar.slice(0, 5).join(', ')}${cat.keywords_ar.length > 5 ? '...' : ''}`);
      console.log(`      📝 EN: ${cat.keywords_en?.slice(0, 5).join(', ') || 'N/A'}${cat.keywords_en?.length > 5 ? '...' : ''}`);
    }
    console.log();
  });

  // 3. Cars Category Deep Dive
  console.log('\n🚗 CARS CATEGORY DEEP DIVE:\n');

  // Find cars category
  const carsCategory = await db.query(`
    SELECT c.id, c.name_ar, c.name_en, c.slug, ce.keywords_ar, ce.keywords_en
    FROM categories c
    LEFT JOIN category_embeddings ce ON c.id = ce.category_id
    WHERE c.slug IN ('cars', 'السيارات', 'سيارات')
       OR c.name_ar IN ('السيارات', 'سيارات')
       OR c.name_en ILIKE '%cars%'
    LIMIT 1
  `);

  if (carsCategory.rows.length > 0) {
    const car = carsCategory.rows[0];
    console.log(`   Category: ${car.name_ar} (${car.name_en})`);
    console.log(`   Slug: ${car.slug}`);

    if (car.keywords_ar && car.keywords_ar.length > 0) {
      console.log(`   ✅ Has keywords!`);
      console.log(`   📝 AR (${car.keywords_ar.length}): ${car.keywords_ar.join(', ')}`);
      console.log(`   📝 EN (${car.keywords_en?.length || 0}): ${car.keywords_en?.join(', ') || 'N/A'}`);
    } else {
      console.log(`   ❌ No keywords found!`);
    }

    // Check subcategories under cars
    console.log('\n   📂 Car Subcategories (first 15):\n');

    const carSubcategories = await db.query(`
      SELECT
        c.name_ar,
        c.name_en,
        c.slug,
        ce.keywords_ar,
        ce.keywords_en,
        CASE
          WHEN ce.keywords_ar IS NOT NULL AND array_length(ce.keywords_ar, 1) > 0
          THEN '✅'
          ELSE '❌'
        END as status
      FROM categories c
      LEFT JOIN category_embeddings ce ON c.id = ce.category_id
      WHERE c.parent_id = $1
      ORDER BY c.name_ar
      LIMIT 15
    `, [car.id]);

    if (carSubcategories.rows.length > 0) {
      carSubcategories.rows.forEach((subcat, idx) => {
        console.log(`      ${idx + 1}. ${subcat.status} ${subcat.name_ar} (${subcat.name_en})`);
        if (subcat.keywords_ar && subcat.keywords_ar.length > 0) {
          console.log(`         📝 ${subcat.keywords_ar.slice(0, 4).join(', ')}...`);
        }
      });

      const subcatWithKeywords = carSubcategories.rows.filter(s => s.status === '✅').length;
      const subcatCoverage = ((subcatWithKeywords / carSubcategories.rows.length) * 100).toFixed(1);
      console.log(`\n      📊 Subcategory coverage: ${subcatWithKeywords}/${carSubcategories.rows.length} (${subcatCoverage}%)`);
    } else {
      console.log('      (No subcategories found)');
    }
  } else {
    console.log('   ❌ Cars category not found!');
  }

  // 4. Recently Updated Keywords
  console.log('\n\n⏰ RECENTLY ADDED/UPDATED KEYWORDS (Last 20):\n');

  const recentKeywords = await db.query(`
    SELECT
      c.name_ar,
      c.name_en,
      c.slug,
      ce.keywords_ar,
      ce.updated_at,
      p.name_ar as parent_name_ar
    FROM category_embeddings ce
    JOIN categories c ON ce.category_id = c.id
    LEFT JOIN categories p ON c.parent_id = p.id
    WHERE ce.keywords_ar IS NOT NULL
      AND array_length(ce.keywords_ar, 1) > 0
    ORDER BY ce.updated_at DESC
    LIMIT 20
  `);

  recentKeywords.rows.forEach((cat, idx) => {
    const parentInfo = cat.parent_name_ar ? ` [under: ${cat.parent_name_ar}]` : '';
    console.log(`   ${idx + 1}. ${cat.name_ar} (${cat.name_en})${parentInfo}`);
    console.log(`      📝 ${cat.keywords_ar.slice(0, 5).join(', ')}...`);
    console.log(`      ⏰ Updated: ${new Date(cat.updated_at).toLocaleString()}`);
    console.log();
  });

  // 5. Categories Still Missing Keywords (Sample)
  console.log('\n❌ CATEGORIES STILL MISSING KEYWORDS (Sample 20):\n');

  const missingKeywords = await db.query(`
    SELECT
      c.name_ar,
      c.name_en,
      c.slug,
      p.name_ar as parent_name_ar,
      p.name_en as parent_name_en
    FROM categories c
    LEFT JOIN category_embeddings ce ON c.id = ce.category_id
    LEFT JOIN categories p ON c.parent_id = p.id
    WHERE (ce.keywords_ar IS NULL OR array_length(ce.keywords_ar, 1) IS NULL OR array_length(ce.keywords_ar, 1) = 0)
      AND c.name_ar !~ '^[0-9]+$'
      AND LENGTH(c.name_ar) > 1
    ORDER BY
      CASE WHEN p.id IS NULL THEN 0 ELSE 1 END,
      c.name_ar
    LIMIT 20
  `);

  missingKeywords.rows.forEach((cat, idx) => {
    const parentInfo = cat.parent_name_ar ? ` [under: ${cat.parent_name_ar}]` : ' [ROOT]';
    console.log(`   ${idx + 1}. ${cat.name_ar} (${cat.name_en})${parentInfo}`);
  });

  // 6. Keyword Quality Check
  console.log('\n\n🔍 KEYWORD QUALITY CHECK:\n');

  const avgKeywordCount = await db.query(`
    SELECT
      AVG(array_length(keywords_ar, 1)) as avg_ar_keywords,
      AVG(array_length(keywords_en, 1)) as avg_en_keywords,
      MIN(array_length(keywords_ar, 1)) as min_ar_keywords,
      MAX(array_length(keywords_ar, 1)) as max_ar_keywords
    FROM category_embeddings
    WHERE keywords_ar IS NOT NULL
      AND array_length(keywords_ar, 1) > 0
  `);

  const stats = avgKeywordCount.rows[0];
  console.log(`   📊 Average Arabic keywords per category: ${parseFloat(stats.avg_ar_keywords).toFixed(1)}`);
  console.log(`   📊 Average English keywords per category: ${parseFloat(stats.avg_en_keywords).toFixed(1)}`);
  console.log(`   📊 Min Arabic keywords: ${stats.min_ar_keywords}`);
  console.log(`   📊 Max Arabic keywords: ${stats.max_ar_keywords}`);

  // 7. Categories with Too Few Keywords (potential issues)
  console.log('\n\n⚠️  CATEGORIES WITH TOO FEW KEYWORDS (<3):\n');

  const fewKeywords = await db.query(`
    SELECT
      c.name_ar,
      c.name_en,
      ce.keywords_ar,
      array_length(ce.keywords_ar, 1) as keyword_count
    FROM category_embeddings ce
    JOIN categories c ON ce.category_id = c.id
    WHERE array_length(ce.keywords_ar, 1) < 3
    ORDER BY array_length(ce.keywords_ar, 1) ASC
    LIMIT 15
  `);

  if (fewKeywords.rows.length > 0) {
    fewKeywords.rows.forEach((cat, idx) => {
      console.log(`   ${idx + 1}. ${cat.name_ar} (${cat.name_en}) - ${cat.keyword_count} keywords`);
      console.log(`      📝 ${cat.keywords_ar.join(', ')}`);
    });
  } else {
    console.log('   ✅ All categories have at least 3 keywords!');
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Report complete!\n');

  process.exit(0);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});

// Run
main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
