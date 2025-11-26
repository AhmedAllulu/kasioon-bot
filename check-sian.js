const db = require('./src/config/database');

(async () => {
  await db.connect();

  console.log('Checking سيان category...\n');

  const result = await db.query(`
    SELECT c.name_ar, c.name_en, c.slug, c.level, ce.keywords_ar
    FROM categories c
    LEFT JOIN category_embeddings ce ON c.id = ce.category_id
    WHERE c.slug = 'sian-1' OR c.id = '035e8b11-4e1c-4ecc-baa2-5c2ae259b583'
  `);

  if (result.rows.length > 0) {
    const cat = result.rows[0];
    console.log(`${cat.name_ar} (${cat.name_en})`);
    console.log(`Slug: ${cat.slug}`);
    console.log(`Level: ${cat.level}`);
    console.log(`Keywords: ${cat.keywords_ar ? cat.keywords_ar.join(', ') : 'NONE'}`);

    if (cat.keywords_ar) {
      const hasMatch = cat.keywords_ar.some(kw => {
        const kwLower = kw.toLowerCase();
        const kwNorm = kwLower.replace(/ة/g, 'ه');
        const token = 'سياره'; // normalized form of سيارة
        return kwLower.includes(token) || token.includes(kwLower) || kwNorm.includes(token) || token.includes(kwNorm);
      });
      console.log(`\nWould match "سياره"? ${hasMatch ? 'YES ⚠️' : 'NO'}`);
    }
  } else {
    console.log('Category not found');
  }

  process.exit(0);
})();
