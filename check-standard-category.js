const database = require('./src/config/database');

async function investigate() {
  try {
    await database.connect();

    console.log('🔍 Investigating Standard category...\n');

    // Check Standard category
    const standardCat = await database.query(`
      SELECT c.*, pc.name_ar as parent_name, pc.slug as parent_slug
      FROM categories c
      LEFT JOIN categories pc ON c.parent_id = pc.id
      WHERE c.slug = 'standard-287'
    `);

    if (standardCat.rows.length > 0) {
      const cat = standardCat.rows[0];
      console.log('📦 Standard Category:');
      console.log(`  Name: ${cat.name_ar} (${cat.name_en})`);
      console.log(`  Slug: ${cat.slug}`);
      console.log(`  Parent: ${cat.parent_name || 'None'} (${cat.parent_slug || 'None'})`);
      console.log(`  Parent ID: ${cat.parent_id || 'None'}`);

      // Find parent's parent
      if (cat.parent_id) {
        const parentCheck = await database.query(`
          SELECT c.*, gp.name_ar as grandparent_name, gp.slug as grandparent_slug
          FROM categories c
          LEFT JOIN categories gp ON c.parent_id = gp.id
          WHERE c.id = $1
        `, [cat.parent_id]);

        if (parentCheck.rows.length > 0) {
          const parent = parentCheck.rows[0];
          console.log(`\n  Parent's details:`);
          console.log(`    Name: ${parent.name_ar} (${parent.slug})`);
          console.log(`    Grandparent: ${parent.grandparent_name || 'None'} (${parent.grandparent_slug || 'None'})`);

          // Check if grandparent is cars category
          if (parent.parent_id) {
            const grandparent = await database.query(`
              SELECT * FROM categories WHERE id = $1
            `, [parent.parent_id]);

            if (grandparent.rows.length > 0) {
              const gp = grandparent.rows[0];
              console.log(`\n  Grandparent details:`);
              console.log(`    Name: ${gp.name_ar} (${gp.slug})`);
              console.log(`    Is this the cars category? ${gp.slug === 'cars' ? 'YES ✅' : 'NO ❌'}`);
            }
          }
        }
      }
    } else {
      console.log('Standard category not found!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

investigate();
