# Database Migrations

This directory contains SQL migration files for the Qasioun MCP Search Server.

## Running Migrations

### Manual Execution

Connect to your PostgreSQL database and run the migration files:

```bash
# Connect to the database
psql $MCP_DATABASE_URL

# Run the migration
\i database/migrations/001_create_semantic_cache.sql
```

### Using psql Command

```bash
psql $MCP_DATABASE_URL -f database/migrations/001_create_semantic_cache.sql
```

## Prerequisites

Before running the semantic cache migration, ensure:

1. **pgvector extension is installed**:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

2. **pg_trgm extension is installed** (for fuzzy matching):
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_trgm;
   ```

## Migration List

1. **001_create_semantic_cache.sql** - Creates the query semantic cache table with vector embeddings support

## Notes

- All migrations are idempotent (using `IF NOT EXISTS`)
- Migrations should be run in numerical order
- Always backup your database before running migrations in production
