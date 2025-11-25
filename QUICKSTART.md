# Quick Start Guide - Qasioun MCP Search Server

## ⚡ Get Started in 5 Minutes

### Step 1: Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit with your values
nano .env
```

**Minimum Required Variables:**
```env
MCP_DATABASE_URL=postgresql://user:pass@localhost:5432/qasioun_marketplace_db
OPENAI_API_KEY=sk-your-key-here
REDIS_URL=redis://localhost:6379
PORT=3355
```

### Step 2: Start Services

**Option A: Docker (Recommended)**
```bash
docker-compose up -d
```

**Option B: Local Development**
```bash
# Install dependencies
npm install

# Start server
npm run dev
```

### Step 3: Test the Server

**Health Check:**
```bash
curl http://localhost:3355/api/health
```

**Test Search (Arabic):**
```bash
curl -X POST http://localhost:3355/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "بدي سيارة في دمشق",
    "language": "ar"
  }'
```

**Test Search (English):**
```bash
curl -X POST http://localhost:3355/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "apartment for rent in Damascus",
    "language": "en"
  }'
```

**Test Query Analysis:**
```bash
curl -X POST http://localhost:3355/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "query": "موبايل سامسونج مستعمل في حلب",
    "language": "ar"
  }'
```

## 📊 Expected Response

Successful search response:
```json
{
  "success": true,
  "data": {
    "query": {
      "original": "بدي سيارة في دمشق",
      "parsed": {
        "category": {
          "id": "uuid",
          "name": "سيارات",
          "slug": "cars",
          "confidence": 0.95
        },
        "location": {
          "id": "uuid",
          "name": "دمشق",
          "type": "city",
          "confidence": 0.98
        },
        "transactionType": {
          "slug": "sale",
          "confidence": 0.85
        }
      }
    },
    "listings": [
      {
        "id": "uuid",
        "title": "سيارة تويوتا كامري 2019",
        "priceFormatted": "15,000,000 ل.س",
        "category": { "name": "سيارات" },
        "location": { "city": "دمشق" },
        "url": "https://kasioon.com/listing/uuid"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 45,
      "totalPages": 5
    }
  },
  "meta": {
    "responseTime": 150,
    "searchMethod": "hybrid",
    "confidence": 0.89
  }
}
```

## 🧪 Test Queries

Try these sample queries:

**Real Estate:**
- `شقة للإيجار في دمشق غرفتين` (2-bedroom apartment for rent in Damascus)
- `منزل للبيع في حلب` (House for sale in Aleppo)
- `أرض للبيع في إدلب` (Land for sale in Idlib)

**Vehicles:**
- `سيارة رخيصة في حمص` (Cheap car in Homs)
- `دراجة نارية للبيع` (Motorcycle for sale)
- `سيارة تويوتا موديل 2020` (Toyota car model 2020)

**Electronics:**
- `موبايل ايفون 14 مستعمل` (Used iPhone 14)
- `حاسوب محمول للبيع` (Laptop for sale)
- `تلفزيون سامسونج جديد` (New Samsung TV)

**Jobs:**
- `وظيفة محاسب في دمشق` (Accountant job in Damascus)
- `مطلوب مهندس برمجيات` (Software engineer wanted)

## 🔍 Understanding the Response

### Query Parsing

The MCP Agent parses the query and extracts:

1. **Category** - Matched using embeddings + keywords
2. **Location** - Syrian cities/neighborhoods
3. **Transaction Type** - Sale, Rent, Exchange, etc.
4. **Attributes** - Price, rooms, area, brand, etc.
5. **Keywords** - Search terms
6. **Confidence** - Overall parsing confidence (0-1)

### Search Methods

- **vector** - Semantic search using embeddings (best for complex queries)
- **text** - Full-text search using PostgreSQL (fast for specific terms)
- **hybrid** - Combined vector + text (best overall performance)

## 🐛 Troubleshooting

### Server won't start

```bash
# Check logs
docker-compose logs -f api

# Or locally
tail -f logs/error.log
```

### Database connection error

```bash
# Test PostgreSQL connection
psql $MCP_DATABASE_URL -c "SELECT 1"

# Check if pgvector extension is installed
psql $MCP_DATABASE_URL -c "SELECT * FROM pg_extension WHERE extname='vector'"
```

### Redis connection error

```bash
# Test Redis connection
redis-cli -u $REDIS_URL ping
```

### OpenAI API errors

- Check your API key is valid
- Ensure you have credits
- Check rate limits

### No search results

- Ensure database has listings with `status = 'active'`
- Check if embeddings are generated (`listing_embeddings` table)
- Verify categories and cities exist

## 📝 Common Issues

### 1. "Could not understand the query"

- Query is too short (minimum 2 characters)
- Try being more specific
- Add location or category keywords

### 2. Slow responses (> 1 second)

- Check database indexes
- Enable Redis caching
- Review database query performance

### 3. No category matched

- Check `categories` table has data
- Verify `category_embeddings` has embeddings
- Try common category names

## 🚀 Next Steps

1. **Configure n8n Workflows**
   - Import `/n8n/workflows/telegram-car-search.json`
   - Set webhook URLs to point to your server

2. **Set up Telegram Bot**
   - Get bot token from [@BotFather](https://t.me/botfather)
   - Configure `TELEGRAM_BOT_TOKEN` in `.env`

3. **Configure WhatsApp Business**
   - Set up WhatsApp Business API
   - Configure webhooks

4. **Production Deployment**
   - Set `NODE_ENV=production`
   - Configure SSL certificates
   - Set up monitoring and logging
   - Configure backup strategy

## 📚 Additional Resources

- [Full README](README.md)
- [API Documentation](docs/API.md) _(to be created)_
- [Database Schema](docs/DATABASE.md) _(to be created)_
- [n8n Workflows](n8n/workflows/)

## 💡 Tips

- Use Redis caching for better performance
- Monitor `/api/health` for service status
- Check logs regularly for errors
- Test with various query formats
- Arabic queries generally work better for Syrian users

---

Need help? Check the [README](README.md) or create an issue on GitHub.
