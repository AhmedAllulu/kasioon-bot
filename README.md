# Qasioun MCP Search Server

AI-powered natural language search server for Qasioun Marketplace - Syria's classified ads platform. Built with Model Context Protocol (MCP) architecture for intelligent Arabic/English query parsing and semantic search.

## 🎯 Features

- **Natural Language Search** - Parse Arabic/English queries like "بدي سيارة رخيصة في إدلب"
- **Semantic Vector Search** - Embedding-based similarity matching using OpenAI text-embedding-3-large
- **Hybrid Search** - Combined vector + full-text search for optimal results
- **Voice Search** - Transcribe voice messages using Whisper API
- **Multi-Platform** - Unified API for website, mobile app, Telegram, and WhatsApp
- **Sub-200ms Response Time** - Optimized with Redis caching and PostgreSQL indexing
- **n8n Integration** - Webhook endpoints for messaging platform automation

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│           Qasioun MCP Search Server             │
├─────────────────────────────────────────────────┤
│  MCP Agent (Query Parser)                       │
│  ├─ QueryParser                                 │
│  ├─ CategoryMatcher (Embeddings + Keywords)     │
│  ├─ LocationResolver (Syrian Cities)            │
│  └─ AttributeExtractor (Category-specific)      │
├─────────────────────────────────────────────────┤
│  Search Services                                │
│  ├─ VectorSearch (Semantic)                     │
│  ├─ TextSearch (Full-text)                      │
│  └─ SearchService (Hybrid Orchestrator)         │
├─────────────────────────────────────────────────┤
│  Data Layer                                     │
│  ├─ PostgreSQL (Listings, Categories, etc.)     │
│  ├─ Redis (Caching)                             │
│  └─ OpenAI (GPT-4o, Embeddings, Whisper)        │
└─────────────────────────────────────────────────┘
```

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL 15+ with pgvector extension
- Redis 7+
- OpenAI API key
- Docker & Docker Compose (optional)

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd kasioon-bot
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
nano .env
```

**Required Variables:**
```env
# Database (Qasioun Marketplace)
MCP_DATABASE_URL=postgresql://user:password@host:5432/qasioun_marketplace_db

# OpenAI
OPENAI_API_KEY=sk-your-api-key-here

# Redis
REDIS_URL=redis://localhost:6379

# Server
PORT=3355
NODE_ENV=production
```

### 3. Start with Docker Compose

```bash
docker-compose up -d
```

### 4. Start Locally (Development)

```bash
npm run dev
```

## 📡 API Endpoints

### Main Search

```http
POST /api/search
Content-Type: application/json

{
  "query": "بدي سيارة رخيصة في إدلب",
  "language": "ar",
  "source": "api",
  "page": 1,
  "limit": 10
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "query": {
      "original": "بدي سيارة رخيصة في إدلب",
      "parsed": {
        "category": { "id": "...", "name": "سيارات" },
        "location": { "id": "...", "name": "إدلب" },
        "transactionType": { "slug": "sale" }
      }
    },
    "listings": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 45,
      "totalPages": 5
    }
  },
  "meta": {
    "responseTime": 150,
    "searchMethod": "hybrid"
  }
}
```

### Query Analysis

```http
POST /api/analyze
Content-Type: application/json

{
  "query": "شقة غرفتين للإيجار في دمشق",
  "language": "ar"
}
```

### Voice Search

```http
POST /api/search/voice
Content-Type: multipart/form-data

audio: [voice file]
source: telegram
language: ar
```

### Telegram Webhook (n8n)

```http
POST /api/webhooks/telegram

{
  "chatId": "123456789",
  "userId": "987654321",
  "messageType": "text",
  "text": "بدي موبايل سامسونج",
  "language": "ar"
}
```

### WhatsApp Webhook (n8n)

```http
POST /api/webhooks/whatsapp

{
  "from": "+963912345678",
  "messageType": "text",
  "text": "أبحث عن شقة في دمشق",
  "language": "ar"
}
```

### Health Check

```http
GET /api/health
```

## 🧪 Testing

### Test Search Query

```bash
curl -X POST http://localhost:3355/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "سيارة في دمشق",
    "language": "ar"
  }'
```

### Test Query Analysis

```bash
curl -X POST http://localhost:3355/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "query": "موبايل ايفون 14 مستعمل",
    "language": "ar"
  }'
```

## 🗄️ Database Setup

The server expects a PostgreSQL database with the following key tables:

- `categories` - Hierarchical category system (450+ categories)
- `listings` - Main listings table
- `cities` - Syrian governorates and cities
- `neighborhoods` - Areas within cities
- `transaction_types` - Sale, Rent, Exchange, etc.
- `listing_attributes` - Dynamic attribute definitions
- `listing_attribute_values` - Actual attribute values
- `category_embeddings` - Category embeddings for semantic search
- `listing_embeddings` - Listing embeddings for semantic search

**Required PostgreSQL Extensions:**
- `pgvector` - For vector similarity search
- `pg_trgm` - For trigram text search

## 📊 Performance Optimization

- **Redis Caching**: 5-30 minute TTL on search results and structure data
- **Database Indexing**: Optimized indexes on categories, cities, listings
- **Vector Search**: Pre-computed embeddings for categories and listings
- **Connection Pooling**: 5-20 connections to PostgreSQL

## 🔧 Configuration

### Cache TTLs (seconds)

```env
SEARCH_CACHE_TTL=300           # Search results
STRUCTURE_CACHE_TTL=1800       # Categories, cities
AI_RESPONSE_CACHE_TTL=3600     # AI parsed queries
```

### Rate Limiting

```env
RATE_LIMIT_WINDOW_MS=900000    # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100    # Max requests per window
```

## 🐛 Debugging

### View Logs

```bash
# Docker
docker-compose logs -f api

# PM2
pm2 logs kasioon-mcp

# Local
tail -f logs/combined.log
tail -f logs/error.log
```

### Test Database Connection

```bash
curl http://localhost:3355/api/health
```

## 📦 Project Structure

```
kasioon-bot/
├── src/
│   ├── server.js                 # Express server entry point
│   ├── config/                   # Database, Redis, OpenAI config
│   ├── routes/                   # Express routes
│   ├── controllers/              # Request handlers
│   ├── services/
│   │   ├── mcp/                  # MCP Agent components
│   │   ├── search/               # Search services
│   │   ├── ai/                   # OpenAI, Whisper services
│   │   ├── messaging/            # Telegram, WhatsApp formatters
│   │   └── cache/                # Redis cache service
│   ├── utils/                    # Utilities (logger, normalizer)
│   └── middleware/               # Express middleware
├── logs/                         # Application logs
├── uploads/                      # Temporary voice uploads
├── docker-compose.yml            # Docker orchestration
├── Dockerfile                    # Docker image
└── package.json                  # Dependencies
```

## 🔐 Security

- Rate limiting on all endpoints
- Helmet.js security headers
- Input validation with express-validator
- Error sanitization in production
- Non-root Docker container

## 📈 Monitoring

Health check endpoints:
- `/api/health` - Full health status
- `/api/health/ready` - Readiness probe
- `/api/health/live` - Liveness probe

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

ISC

## 🆘 Support

For issues and questions:
- GitHub Issues: [repository-url]/issues
- Email: support@kasioon.com

---

Built with ❤️ for Syria 🇸🇾
