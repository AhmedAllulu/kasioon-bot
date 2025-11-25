-- Migration: Create query semantic cache table
-- Description: Stores query embeddings for semantic similarity matching
-- Date: 2024-01-25

-- Create semantic cache table (if not exists)
CREATE TABLE IF NOT EXISTS query_semantic_cache (
  id SERIAL PRIMARY KEY,
  query_text VARCHAR(500) NOT NULL UNIQUE,
  query_embedding vector(1536), -- text-embedding-3-large with reduced dimensions for pgvector compatibility
  parsed_result JSONB NOT NULL,
  hit_count INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for vector similarity search using HNSW
-- Note: Requires pgvector extension (0.5.0+)
CREATE INDEX IF NOT EXISTS idx_semantic_cache_embedding
ON query_semantic_cache
USING hnsw (query_embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Create index for text lookup
CREATE INDEX IF NOT EXISTS idx_semantic_cache_query
ON query_semantic_cache (query_text);

-- Create index for hit_count (to analyze popular queries)
CREATE INDEX IF NOT EXISTS idx_semantic_cache_hits
ON query_semantic_cache (hit_count DESC);

-- Create index for updated_at (to cleanup old entries)
CREATE INDEX IF NOT EXISTS idx_semantic_cache_updated
ON query_semantic_cache (updated_at);

-- Add comment to table
COMMENT ON TABLE query_semantic_cache IS 'Semantic cache for parsed queries using vector similarity';
COMMENT ON COLUMN query_semantic_cache.query_embedding IS 'Vector embedding of the query text (1536 dimensions for text-embedding-3-large, reduced for pgvector compatibility)';
COMMENT ON COLUMN query_semantic_cache.parsed_result IS 'Cached parsed result as JSON';
COMMENT ON COLUMN query_semantic_cache.hit_count IS 'Number of times this cached result was reused';
