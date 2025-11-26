const db = require('./src/config/database');
const OpenAI = require('openai');
const dotenv = require('dotenv');

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Configuration
const BATCH_SIZE = 10; // Process 10 categories at a time
const DELAY_BETWEEN_BATCHES = 1000; // 1 second delay to avoid rate limits
const DRY_RUN = process.argv.includes('--dry-run'); // Test mode

/**
 * Generate keywords for a category using AI with retry logic
 */
async function generateKeywords(categoryNameAr, categoryNameEn, categorySlug, parentCategory, retries = 3) {
  // Build context string
  let contextStr = '';
  if (parentCategory && parentCategory.name_ar) {
    contextStr = `
Parent Category: ${parentCategory.name_ar} (${parentCategory.name_en})
Context: This is a subcategory under "${parentCategory.name_ar}"`;
  }

  const prompt = `Generate search keywords for this e-commerce category:
Arabic Name: ${categoryNameAr}
English Name: ${categoryNameEn}
Slug: ${categorySlug}${contextStr}

Generate 8-12 relevant Arabic keywords and 6-8 English keywords that users might search for when looking for items in this category.

Rules:
1. Include the category name and common variations
2. Include related terms and synonyms specific to this context
3. Include common misspellings (especially for Arabic with/without hamza, ta marbuta variations)
4. Consider the parent category context when generating keywords
5. Keep keywords short (1-3 words max)
6. Return ONLY a JSON object with no markdown formatting

Example format:
{"keywords_ar": ["كلمة1", "كلمة2", "كلمه2"], "keywords_en": ["word1", "word2"]}`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini', // Cheap and fast
        messages: [
          {
            role: 'system',
            content: 'You are a keyword generation expert for Arabic e-commerce search. Generate relevant search keywords in both Arabic and English. Return only valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 300
      });

      const content = response.choices[0].message.content.trim();

      // Remove markdown code blocks if present
      const jsonContent = content.replace(/```json\n?|\n?```/g, '').trim();

      const keywords = JSON.parse(jsonContent);

      return {
        keywords_ar: keywords.keywords_ar || [],
        keywords_en: keywords.keywords_en || []
      };
    } catch (error) {
      if (attempt < retries && (error.status === 429 || error.status === 503)) {
        // Rate limit or service unavailable - wait and retry
        const waitTime = attempt * 2000; // 2s, 4s, 6s
        console.log(`   ⏳ Rate limited, waiting ${waitTime}ms before retry ${attempt + 1}...`);
        await sleep(waitTime);
        continue;
      }

      if (attempt === retries) {
        console.error(`   ❌ Error after ${retries} attempts:`, error.message);

        // Fallback: use category name as keyword
        return {
          keywords_ar: [categoryNameAr.toLowerCase()],
          keywords_en: [categoryNameEn.toLowerCase()]
        };
      }
    }
  }
}

/**
 * Update category keywords in database
 */
async function updateCategoryKeywords(categoryId, keywordsAr, keywordsEn) {
  if (DRY_RUN) {
    console.log(`   [DRY RUN] Would update category ${categoryId}`);
    return;
  }

  try {
    // Check if record exists
    const existing = await db.query(
      `SELECT id FROM category_embeddings WHERE category_id = $1`,
      [categoryId]
    );

    if (existing.rows.length > 0) {
      // Update existing record
      await db.query(
        `UPDATE category_embeddings
         SET keywords_ar = $1, keywords_en = $2, updated_at = NOW()
         WHERE category_id = $3`,
        [keywordsAr, keywordsEn, categoryId]
      );
    } else {
      // Insert new record with generated UUID
      await db.query(
        `INSERT INTO category_embeddings (id, category_id, keywords_ar, keywords_en, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW())`,
        [categoryId, keywordsAr, keywordsEn]
      );
    }
  } catch (error) {
    console.error(`   ❌ Database error for category ${categoryId}:`, error.message);
  }
}

/**
 * Sleep for delay
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Category Keywords Generator\n');

  if (DRY_RUN) {
    console.log('⚠️  DRY RUN MODE - No changes will be saved\n');
  }

  await db.connect();

  // Get categories without keywords (skip obvious junk) with parent info
  const result = await db.query(`
    SELECT
      c.id,
      c.name_ar,
      c.name_en,
      c.slug,
      c.parent_id,
      p.name_ar as parent_name_ar,
      p.name_en as parent_name_en,
      p.slug as parent_slug
    FROM categories c
    LEFT JOIN category_embeddings ce ON c.id = ce.category_id
    LEFT JOIN categories p ON c.parent_id = p.id
    WHERE (ce.keywords_ar IS NULL OR array_length(ce.keywords_ar, 1) IS NULL OR array_length(ce.keywords_ar, 1) = 0)
      AND c.name_ar NOT IN ('1', '2', '3', '4', '5', '6', '7', '8', '9', '0')
      AND c.name_ar !~ '^[0-9]+$'
      AND LENGTH(c.name_ar) > 1
    ORDER BY c.name_ar
  `);

  const categories = result.rows;
  const total = categories.length;

  console.log(`📊 Found ${total} categories without keywords\n`);

  if (total === 0) {
    console.log('✅ All categories already have keywords!');
    process.exit(0);
  }

  // Confirm before proceeding
  if (!DRY_RUN) {
    console.log('💰 Estimated cost: ~$0.12');
    console.log('⏱️  Estimated time: ~' + Math.ceil(total / BATCH_SIZE) + ' minutes\n');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
    await sleep(5000);
  }

  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  // Process in batches
  for (let i = 0; i < categories.length; i += BATCH_SIZE) {
    const batch = categories.slice(i, i + BATCH_SIZE);

    console.log(`\n📦 Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(total / BATCH_SIZE)}`);
    console.log('─'.repeat(60));

    // Process batch in parallel
    const promises = batch.map(async (category) => {
      try {
        // Build display string with parent context
        const displayName = category.parent_name_ar
          ? `${category.name_ar} (${category.name_en}) [under: ${category.parent_name_ar}]`
          : `${category.name_ar} (${category.name_en})`;

        console.log(`\n🔄 Processing: ${displayName}`);

        // Pass parent category info
        const parentCategory = category.parent_id
          ? {
              name_ar: category.parent_name_ar,
              name_en: category.parent_name_en,
              slug: category.parent_slug
            }
          : null;

        const keywords = await generateKeywords(
          category.name_ar,
          category.name_en,
          category.slug,
          parentCategory
        );

        console.log(`   📝 AR: ${keywords.keywords_ar.join(', ')}`);
        console.log(`   📝 EN: ${keywords.keywords_en.join(', ')}`);

        await updateCategoryKeywords(
          category.id,
          keywords.keywords_ar,
          keywords.keywords_en
        );

        console.log(`   ✅ Success`);
        succeeded++;
        processed++;

      } catch (error) {
        console.log(`   ❌ Failed: ${error.message}`);
        failed++;
        processed++;
      }
    });

    await Promise.all(promises);

    // Progress update
    const progress = ((processed / total) * 100).toFixed(1);
    console.log(`\n📊 Progress: ${processed}/${total} (${progress}%) - ✅ ${succeeded} succeeded, ❌ ${failed} failed`);

    // Delay between batches
    if (i + BATCH_SIZE < categories.length) {
      console.log(`⏳ Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`);
      await sleep(DELAY_BETWEEN_BATCHES);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ COMPLETE!');
  console.log(`   Total processed: ${processed}`);
  console.log(`   Succeeded: ${succeeded}`);
  console.log(`   Failed: ${failed}`);
  console.log('='.repeat(60));

  if (!DRY_RUN) {
    console.log('\n⚠️  Remember to restart the server to reload the keyword cache:');
    console.log('   pm2 restart kasioon-bot');
  }

  process.exit(0);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

// Run
main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
