const db = require('./src/config/database');

(async () => {
  await db.connect();

  const result = await db.query(`
    SELECT c.name_ar, c.slug, ce.keywords_ar
    FROM categories c
    LEFT JOIN category_embeddings ce ON c.id = ce.category_id
    WHERE c.slug IN ('real-estate', 'cars', 'residential')
    ORDER BY c.slug
  `);

  result.rows.forEach(row => {
    console.log(`\n${row.name_ar} (${row.slug}):`);
    if (row.keywords_ar && row.keywords_ar.length > 0) {
      console.log(`  Keywords: ${row.keywords_ar.join(', ')}`);
      const hasSiara = row.keywords_ar.some(k => k.includes('سيار'));
      console.log(`  Has سيارة-related? ${hasSiara ? 'YES ⚠️' : 'NO'}`);
    } else {
      console.log(`  Keywords: NONE`);
    }
  });

  process.exit(0);
})();
