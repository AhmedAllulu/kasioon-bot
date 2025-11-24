-- ============================================================================
-- DATABASE OPTIMIZATION FOR DIRECT SEARCH
-- Target: < 200ms response time for 90% of queries
-- ============================================================================
-- Run this script to add missing indexes and optimize search performance
-- Execute: psql -h localhost -U postgres -d estate -f optimize-database.sql
-- ============================================================================

\timing on
\echo 'Starting database optimization...'
\echo '=================================='
\echo ''

-- ============================================================================
-- 1. ENABLE REQUIRED EXTENSIONS
-- ============================================================================
\echo '📦 Step 1: Enabling PostgreSQL extensions...'

-- Extension for trigram similarity search (essential for Arabic text)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Extension for full-text search
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\echo '✅ Extensions enabled'
\echo ''

-- ============================================================================
-- 2. CREATE MISSING INDEXES FOR SEARCH OPTIMIZATION
-- ============================================================================
\echo '📇 Step 2: Creating optimized indexes...'

-- Category search indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_slug_active
  ON categories(slug, is_active)
  WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_name_ar_trgm
  ON categories USING gin(name_ar gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_name_en_trgm
  ON categories USING gin(name_en gin_trgm_ops);

-- Listing search indexes (compound indexes for common queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_category_city_transaction
  ON listings(category_id, city_id, transaction_type_id, status)
  WHERE status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_category_status_date
  ON listings(category_id, status, created_at DESC)
  WHERE status = 'active';

-- Full-text search indexes for Arabic
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_title_trgm
  ON listings USING gin(title gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_description_trgm
  ON listings USING gin(description gin_trgm_ops);

-- Location search indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cities_name_ar_trgm
  ON cities USING gin(name_ar gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cities_name_en_trgm
  ON cities USING gin(name_en gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_neighborhoods_name_trgm
  ON neighborhoods USING gin(name_ar gin_trgm_ops);

-- Transaction types index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transaction_types_slug
  ON transaction_types(slug);

-- Attribute search indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listing_attributes_name
  ON listing_attributes(attribute_name);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listing_attribute_values_listing_attr
  ON listing_attribute_values(listing_id, attribute_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listing_attribute_values_value
  ON listing_attribute_values(attribute_id, value);

-- Image and video indexes for existence checks
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listing_images_listing_order
  ON listing_images(listing_id, order_index);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listing_videos_listing
  ON listing_videos(listing_id);

-- User info index for listing details
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_id_name_phone
  ON users(id, name, phone);

\echo '✅ Indexes created successfully'
\echo ''

-- ============================================================================
-- 3. OPTIMIZE ARABIC TEXT SEARCH
-- ============================================================================
\echo '🔍 Step 3: Setting up Arabic text search...'

-- Create custom text search configuration for Arabic
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_ts_config WHERE cfgname = 'arabic_simple'
  ) THEN
    CREATE TEXT SEARCH CONFIGURATION arabic_simple (COPY = simple);
    RAISE NOTICE 'Created arabic_simple text search configuration';
  END IF;
END $$;

-- Add search vector column to listings (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'listings' AND column_name = 'search_vector'
  ) THEN
    ALTER TABLE listings ADD COLUMN search_vector tsvector;
    RAISE NOTICE 'Added search_vector column to listings';
  END IF;
END $$;

-- Create function to update search vector
CREATE OR REPLACE FUNCTION listings_search_vector_update()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('arabic_simple', coalesce(NEW.title,'')), 'A') ||
    setweight(to_tsvector('arabic_simple', coalesce(NEW.description,'')), 'B') ||
    setweight(to_tsvector('arabic_simple', coalesce(NEW.area_location,'')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic search vector update
DROP TRIGGER IF EXISTS listings_search_vector_trigger ON listings;
CREATE TRIGGER listings_search_vector_trigger
  BEFORE INSERT OR UPDATE ON listings
  FOR EACH ROW
  EXECUTE FUNCTION listings_search_vector_update();

-- Update existing rows (this may take a few seconds)
\echo 'Updating search vectors for existing listings...'
UPDATE listings
SET search_vector =
  setweight(to_tsvector('arabic_simple', coalesce(title,'')), 'A') ||
  setweight(to_tsvector('arabic_simple', coalesce(description,'')), 'B') ||
  setweight(to_tsvector('arabic_simple', coalesce(area_location,'')), 'C')
WHERE search_vector IS NULL;

-- Create GIN index on search vector
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_search_vector
  ON listings USING gin(search_vector);

\echo '✅ Arabic text search optimized'
\echo ''

-- ============================================================================
-- 4. ANALYZE TABLES FOR QUERY PLANNER
-- ============================================================================
\echo '📊 Step 4: Analyzing tables for query planner...'

ANALYZE listings;
ANALYZE categories;
ANALYZE cities;
ANALYZE neighborhoods;
ANALYZE transaction_types;
ANALYZE listing_attributes;
ANALYZE listing_attribute_values;
ANALYZE listing_images;
ANALYZE users;

\echo '✅ Tables analyzed'
\echo ''

-- ============================================================================
-- 5. PERFORMANCE STATISTICS
-- ============================================================================
\echo '📈 Database optimization statistics:'
\echo '===================================='

SELECT
  'listings' as table_name,
  COUNT(*) as total_rows,
  COUNT(*) FILTER (WHERE status = 'active') as active_rows,
  pg_size_pretty(pg_total_relation_size('listings')) as total_size
FROM listings
UNION ALL
SELECT
  'categories',
  COUNT(*),
  COUNT(*) FILTER (WHERE is_active = true),
  pg_size_pretty(pg_total_relation_size('categories'))
FROM categories
UNION ALL
SELECT
  'listing_attribute_values',
  COUNT(*),
  NULL,
  pg_size_pretty(pg_total_relation_size('listing_attribute_values'))
FROM listing_attribute_values;

\echo ''
\echo '📇 Index statistics:'
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE tablename IN ('listings', 'categories', 'cities', 'listing_attribute_values')
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 20;

\echo ''
\echo '✅ DATABASE OPTIMIZATION COMPLETE!'
\echo '===================================='
\echo 'Next steps:'
\echo '1. Test search performance with: npm run test:search'
\echo '2. Monitor slow queries in logs'
\echo '3. Adjust indexes based on actual query patterns'
\echo ''
