# Changelog - Telegram Bot Enhancements

## Version 1.1.0 - November 26, 2025

### 🎉 New Features

#### 1. Voice Message Support with Whisper-1
**Location:** [src/services/messaging/TelegramBot.js](src/services/messaging/TelegramBot.js#L165-L229)

- **What:** Users can now send voice messages to search for listings
- **How it works:**
  1. User sends a voice message via Telegram
  2. Bot downloads the audio file
  3. Whisper-1 API transcribes the Arabic audio to text
  4. Transcribed text is processed as a search query
  5. Results are sent back to the user

- **User Experience:**
  ```
  User: *sends voice message "بدي سيارة BMW بدمشق"*
  Bot: 🎤 عم اسمع الرسالة الصوتية...
  Bot: 📝 سمعتك: "بدي سيارة BMW بدمشق"
       🔍 عم دور...
  Bot: *sends search results*
  ```

#### 2. Location-Based Sorting by Province
**Location:** [src/services/search/SearchService.js](src/services/search/SearchService.js#L593-L668)

- **What:** Search results are now sorted by location proximity
- **Sorting Priority:**
  1. **Same city** (highest priority) - Exact matches from the searched city
  2. **Same province** (medium priority) - Listings from the same province/governorate
  3. **Other provinces** (lowest priority) - Listings from other provinces
  4. Within each tier, maintains original relevance score

- **Example:**
  - Search: "سيارة في حمص"
  - Results order:
    1. Cars in Homs city (exact match)
    2. Cars in other cities in Homs governorate
    3. Cars in other governorates (sorted by relevance)

- **Technical Details:**
  - Queries city's province from database
  - Sorts results before pagination
  - Falls back gracefully if province data unavailable

#### 3. Province Data in Search Results
**Modified Files:**
- [src/services/search/TextSearch.js](src/services/search/TextSearch.js)
  - Added `ct.province_ar` and `ct.province_en` to all SELECT queries
  - Added `l.price`, `l.currency`, `l.attributes` for richer results

---

### 🐛 Bug Fixes

#### 1. Fixed Undefined Category Name in Telegram Messages
**Location:** [src/services/messaging/TelegramFormatter.js](src/services/messaging/TelegramFormatter.js#L44-L58)

- **Problem:** Category and location names showed as "undefined" in Telegram messages
- **Root Cause:** Parser was returning `category: "none"` (string) instead of object with `name_ar/name_en` properties
- **Solution:** Added type checking to ensure category/location are objects before accessing properties

- **Before:**
  ```
  📂 undefined في undefined
  📊 في عنا 11 إعلان
  ```

- **After:**
  ```
  📊 في عنا 11 إعلان
  ```
  (Only shows category/location if properly detected)

---

### 🎨 Improvements

#### Friendlier Conversation Style
All bot messages now use casual Syrian Arabic dialect:

**Message Examples:**
- Start: "أهلاً وسهلاً! 👋" instead of "مرحباً بك"
- Search header: "لقيتلك هالإعلانات ✨" instead of "نتائج البحث"
- Results count: "في عنا 15 إعلان" instead of "تم العثور على"
- No results: "ما لقيت شي للأسف 😔" instead of "لم يتم العثور"
- More results: "وفي كمان 10 إعلان تاني" instead of "يوجد إعلانات إضافية"

---

### 📊 Database Changes

**Added Province Fields to Search Queries:**
```sql
SELECT
  ...
  ct.province_ar,
  ct.province_en,
  l.price,
  l.currency,
  l.attributes,
  ...
FROM listings l
JOIN cities ct ON l.city_id = ct.id
```

This enables:
- Location-based sorting
- Province filtering (future)
- Richer result data

---

### 🔧 Technical Details

#### Voice Message Flow
1. **Handler:** `TelegramBot.handleVoiceMessage()`
2. **Download:** Telegram Bot API → ArrayBuffer
3. **Transcribe:** WhisperService.transcribeBuffer() → text
4. **Search:** SearchService.search(transcribed text) → results
5. **Format:** TelegramFormatter → user-friendly message
6. **Send:** Telegram Bot API → user

#### Location Sorting Flow
1. **Parse:** Query parsed → location object
2. **Lookup:** Database query to get province of search city
3. **Sort:** Results sorted by:
   - City match score (3 points)
   - Province match score (2 points)
   - Original relevance score
4. **Return:** Sorted results paginated and sent to user

---

### 📝 Files Modified

#### New Files:
- None (all features integrated into existing files)

#### Modified Files:
1. **[src/services/messaging/TelegramBot.js](src/services/messaging/TelegramBot.js)**
   - Added voice message handler
   - Added WhisperService, axios, fs imports

2. **[src/services/messaging/TelegramFormatter.js](src/services/messaging/TelegramFormatter.js)**
   - Fixed undefined category/location bug
   - Updated to friendlier Syrian dialect

3. **[src/services/search/SearchService.js](src/services/search/SearchService.js)**
   - Added `sortByLocationProximity()` method
   - Integrated location sorting into search flow

4. **[src/services/search/TextSearch.js](src/services/search/TextSearch.js)**
   - Added province fields to all SELECT queries
   - Added price, currency, attributes to results

---

### ✅ Testing Checklist

- [x] Voice messages transcribed correctly
- [x] Arabic voice recognized by Whisper-1
- [x] Location sorting works for searches with city
- [x] No errors when province data missing
- [x] Category/location names no longer undefined
- [x] Friendly messages display correctly in Telegram

---

### 🚀 Usage Examples

#### Voice Search
```
User: *🎤 Voice message: "بدي شقة بدمشق"*

Bot: 🎤 عم اسمع الرسالة الصوتية...
Bot: 📝 سمعتك: "بدي شقة بدمشق"
     🔍 عم دور...

Bot: ✨ لقيتلك هالإعلانات
     📊 في عنا 25 إعلان

     1️⃣ شقة 3 غرف في المزة
     💰 50,000,000 ل.س
     📍 دمشق - المزة
     🛏️ 3 غرف • 🚿 2 حمام • 📐 120 م²
     🔗 عرض التفاصيل
     ...
```

#### Location-Sorted Search
```
Search: "سيارة في حلب"

Results Order:
1. BMW 2020 - حلب (same city)
2. Mercedes 2019 - حلب (same city)
3. Toyota 2021 - اعزاز (same province: حلب)
4. Kia 2020 - منبج (same province: حلب)
5. Hyundai 2022 - دمشق (different province)
```

---

### 📖 Related Documentation

- [TELEGRAM_BOT_GUIDE.md](TELEGRAM_BOT_GUIDE.md) - Full integration guide
- [src/services/ai/WhisperService.js](src/services/ai/WhisperService.js) - Voice transcription service

---

**Version:** 1.1.0
**Date:** November 26, 2025
**Status:** ✅ Production Ready
