const db = require('./src/config/database');
const ArabicNormalizer = require('./src/utils/arabicNormalizer');

(async () => {
  await db.connect();

  console.log('🔍 Debugging category SQL match for "سيارة"\n');

  const tokens = ['سيارة', 'في', 'إدلب', 'للبيع'];
  const normalizedTokens = tokens.map(t => ArabicNormalizer.normalizeAndLower(t));

  console.log('Normalized tokens:', normalizedTokens);

  // Test the exact query from matchCategory
  console.log('\n📊 Testing database keyword array search:\n');

  const keywordResult = await db.query(`
    SELECT
      c.id, c.slug, c.name_ar, c.name_en, c.level, c.parent_id, c.path,
      c.is_active, c.sort_order,
      ce.keywords_ar,
      c.meta_keywords_ar,
      0.95 as confidence,
      CASE
        WHEN ce.keywords_ar && $1::text[] THEN 'keywords_ar matched'
        WHEN c.meta_keywords_ar ILIKE ANY(ARRAY(SELECT '%' || unnest($1::text[]) || '%')) THEN 'meta_keywords matched'
        ELSE 'no match'
      END as match_reason
    FROM categories c
    LEFT JOIN category_embeddings ce ON c.id = ce.category_id
    WHERE c.is_active = true
      AND (
        ce.keywords_ar && $1::text[]
        OR c.meta_keywords_ar ILIKE ANY(ARRAY(SELECT '%' || unnest($1::text[]) || '%'))
      )
    ORDER BY c.level DESC, c.sort_order ASC
    LIMIT 5
  `, [normalizedTokens]);

  console.log(`Found ${keywordResult.rows.length} matches:\n`);

  keywordResult.rows.forEach((row, idx) => {
    console.log(`${idx + 1}. ${row.name_ar} (${row.slug})`);
    console.log(`   Level: ${row.level}, Sort: ${row.sort_order}, Active: ${row.is_active}`);
    console.log(`   Match reason: ${row.match_reason}`);
    console.log(`   Keywords AR: ${row.keywords_ar ? row.keywords_ar.join(', ') : 'NONE'}`);
    console.log(`   Meta keywords: ${row.meta_keywords_ar || 'NONE'}`);
    console.log();
  });

  // Also check cars category specifically
  console.log('\n🚗 Checking cars category specifically:\n');

  const carsCheck = await db.query(`
    SELECT
      c.id, c.slug, c.name_ar, c.level, c.is_active, c.sort_order,
      ce.keywords_ar,
      ce.keywords_ar && $1::text[] as keywords_match,
      c.meta_keywords_ar
    FROM categories c
    LEFT JOIN category_embeddings ce ON c.id = ce.category_id
    WHERE c.slug = 'cars'
  `, [normalizedTokens]);

  if (carsCheck.rows.length > 0) {
    const car = carsCheck.rows[0];
    console.log(`${car.name_ar}:`);
    console.log(`  Keywords: ${car.keywords_ar ? car.keywords_ar.join(', ') : 'NONE'}`);
    console.log(`  Keywords match (&&): ${car.keywords_match}`);
    console.log(`  Level: ${car.level}, Active: ${car.is_active}`);
    console.log(`  Sort order: ${car.sort_order}`);
    console.log(`  Meta keywords: ${car.meta_keywords_ar || 'NONE'}`);
  }

  process.exit(0);
})();
