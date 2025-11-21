# Kasioon API Integration - COMPLETE ✅

## Integration Status

**Status:** ✅ **COMPLETE**

The Kasioon marketplace search API has been fully integrated into the bot.

## What Was Implemented

### 1. Search Endpoint Integration
- **Endpoint:** `GET /api/search/listings`
- **Method:** GET with query parameters
- **Authentication:** Optional (Bearer token if provided)
- **Response Parsing:** Extracts `data.listings` array

### 2. Parameter Normalization
- ✅ Category filtering via `categorySlug`
- ✅ Location filtering (`cityName`, `province`)
- ✅ Price filtering (`price.min`, `price.max`)
- ✅ Area filtering (`area.min`, `area.max`)
- ✅ Transaction type (`transactionTypeSlug`)
- ✅ Keywords search
- ✅ Dynamic attributes for vehicles and real estate
- ✅ Sorting (`sortBy`, `sortOrder`)
- ✅ Pagination (`page`, `limit`)
- ✅ Filters (`featured`, `hasImages`, `hasVideo`)

### 3. Additional Endpoints
- ✅ `GET /api/listings/:id` - Get listing details
- ✅ `GET /api/search/structure/lightweight` - Get categories

### 4. Features
- ✅ Caching (5 minutes for searches, 10 minutes for details)
- ✅ Error handling with fallbacks
- ✅ Debug logging throughout
- ✅ Support for Arabic and English
- ✅ Dynamic attributes for category-specific filters

## Configuration

Update your `.env` file:

```bash
# Kasioon API Configuration
KASIOON_API_URL=https://api.kasioon.com
KASIOON_API_KEY=your_api_key_here  # Optional
KASIOON_API_LANGUAGE=ar  # or 'en'
```

## How It Works

1. **User sends message** → "أريد شقة في دمشق"
2. **AI extracts parameters** → `{category: "real-estate", city: "Damascus", keywords: "apartment"}`
3. **Parameters normalized** → `{categorySlug: "real-estate", cityName: "Damascus", keywords: "apartment"}`
4. **API call made** → `GET /api/search/listings?categorySlug=real-estate&cityName=Damascus&keywords=apartment&language=ar`
5. **Results formatted** → AI formats the response for user
6. **Response sent** → User receives formatted results

## Example API Call

```javascript
GET https://api.kasioon.com/api/search/listings?
  categorySlug=apartments&
  cityName=Damascus&
  price.min=100000&
  price.max=500000&
  page=1&
  limit=20&
  language=ar
```

## Response Format

```json
{
  "success": true,
  "data": {
    "listings": [
      {
        "id": "...",
        "title": "...",
        "description": "...",
        "category": {...},
        "location": {...},
        "attributes": {
          "price": 450000,
          "area": 150,
          "rooms": 3
        },
        "images": [...]
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 95
    }
  }
}
```

## Testing

1. **Set API URL in .env:**
   ```bash
   KASIOON_API_URL=https://api.kasioon.com
   ```

2. **Restart bot:**
   ```bash
   pm2 restart kasioon-bot
   ```

3. **Test with Telegram:**
   - Send: "أريد شقة في دمشق"
   - Check logs: `pm2 logs kasioon-bot | grep "\[SEARCH\]"`

## Debug Logs

You'll see detailed logs for:
- Parameter normalization
- API request details
- Response structure
- Caching status
- Error handling

## Next Steps

1. ✅ API integration complete
2. ⚠️  Test with actual API endpoint
3. ⚠️  Verify category slugs match your API
4. ⚠️  Test location mapping
5. ⚠️  Verify response formatting

## Files Updated

- ✅ `src/services/search/marketplaceSearch.js` - Full API integration
- ✅ `env-config.txt` - Updated configuration
- ✅ `TODO.txt` - Marked as complete

## Support

If you encounter issues:
1. Check logs: `pm2 logs kasioon-bot`
2. Verify API URL is correct
3. Test API endpoint directly with curl
4. Check debug logs for parameter normalization

