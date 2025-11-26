const database = require('./src/config/database');

async function check() {
  try {
    await database.connect();

    const hyundai = await database.query(`
      SELECT c.*, p.name_ar as parent_name, p.slug as parent_slug
      FROM categories c
      LEFT JOIN categories p ON c.parent_id = p.id
      WHERE c.slug = 'hyundai'
    `);

    if (hyundai.rows.length > 0) {
      const h = hyundai.rows[0];
      console.log(`Hyundai parent: ${h.parent_name} (${h.parent_slug})`);
      console.log(`Is parent 'cars'? ${h.parent_slug === 'cars' ? 'YES ✅' : 'NO'}`);
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

check();
