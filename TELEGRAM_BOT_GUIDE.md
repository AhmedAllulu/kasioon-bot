# Telegram Bot Integration Guide

## ✅ Setup Complete!

Your Kasioon Telegram Bot is now fully integrated and running!

**Bot Username:** [@kasioonplatform_bot](https://t.me/kasioonplatform_bot)
**Bot Name:** مساعد قاسيون الذكي

---

## 🔧 Technical Setup

### Webhook Configuration
- **Webhook URL:** `https://chato-app.com/api/webhooks/telegram`
- **Status:** ✅ Active
- **Allowed Updates:** `message`, `callback_query`

### Apache Reverse Proxy
Added to `/etc/apache2/sites-available/chato-app.conf`:
```apache
ProxyPass        /api/webhooks/telegram https://localhost:3355/api/webhooks/telegram
ProxyPassReverse /api/webhooks/telegram https://localhost:3355/api/webhooks/telegram
```

### Server Configuration
- Node.js server running on port **3355** (HTTPS)
- Telegram bot integrated with Telegraf
- Trust proxy enabled for proper IP detection behind Apache
- Webhook handler registered before API routes

---

## 🧪 How to Test

### 1. Open the Bot
Go to Telegram and search for: **@kasioonplatform_bot**

Or click: https://t.me/kasioonplatform_bot

### 2. Start a Conversation
Click "START" or send `/start`

You should see a friendly welcome message in Syrian Arabic.

### 3. Try Search Queries
Send any of these test messages:

```
بدي سيارة
```
```
شقة للإيجار في دمشق
```
```
موبايل ايفون
```
```
سيارة BMW موديل حديث
```

### 4. Expected Response
The bot will:
1. Show a "typing..." indicator
2. Send formatted search results with:
   - ✨ Friendly header: "لقيتلك هالإعلانات"
   - 💰 Prices
   - 📍 Locations (city + neighborhood)
   - 🏷️ Attributes (rooms, area, year, brand, mileage, etc.)
   - 🔗 Direct links to `https://www.kasioon.com/listing/{id}`
   - 🌐 Button to "شوف الكل على الموقع"
   - 🔍 Button for "بحث جديد"

---

## 📱 Bot Features

### Commands
- `/start` - Welcome message with instructions
- `/help` - Usage guide

### Conversational Style
All messages use friendly Syrian dialect:
- "أهلاً وسهلاً!" instead of "مرحباً"
- "في عنا" instead of "تم العثور على"
- "ما لقيت شي" instead of "لم يتم العثور"
- "احكيلي شو بدك" instead of "أرسل استفسارك"

### Smart Search
- Natural language processing
- Category detection (cars, real estate, electronics, etc.)
- Location detection
- Attribute extraction (year, brand, price range, etc.)
- Intelligent fallback when no results found

---

## 🔍 Monitoring

### Check Logs
```bash
pm2 logs kasioon-bot --lines 50
```

### Monitor Telegram Messages
```bash
pm2 logs kasioon-bot | grep -i telegram
```

### Check Webhook Status
```bash
node scripts/setup-telegram-webhook-proxy.js
```

### Test Webhook Manually
```bash
curl -k -X POST https://chato-app.com/api/webhooks/telegram \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

---

## 🛠️ Troubleshooting

### No Response from Bot
1. Check if server is running: `pm2 status kasioon-bot`
2. Check logs: `pm2 logs kasioon-bot --lines 100`
3. Verify webhook: Run `node scripts/setup-telegram-webhook-proxy.js`
4. Test endpoint: `curl -k https://chato-app.com/api/webhooks/telegram`

### 404 Errors
If you see 404 errors in logs:
1. Restart the server: `pm2 restart kasioon-bot`
2. Verify Apache config is loaded: `apache2ctl configtest`
3. Reload Apache: `systemctl reload apache2`

### Bot Not Responding
1. Send a new message to trigger webhook
2. Old messages during downtime are not retried by Telegram
3. Check `pending_update_count` is 0 with webhook status check

---

## 📁 Key Files

- **Bot Service:** [src/services/messaging/TelegramBot.js](src/services/messaging/TelegramBot.js)
- **Message Formatter:** [src/services/messaging/TelegramFormatter.js](src/services/messaging/TelegramFormatter.js)
- **Server Config:** [src/server.js](src/server.js)
- **Setup Script:** [scripts/setup-telegram-webhook-proxy.js](scripts/setup-telegram-webhook-proxy.js)
- **Apache Config:** `/etc/apache2/sites-available/chato-app.conf`

---

## 🚀 Next Steps

Your bot is ready to use! Just:
1. Open https://t.me/kasioonplatform_bot
2. Send `/start`
3. Start searching!

The bot will respond to every message with search results from your Kasioon marketplace.

---

**Need help?** Check the logs or review this guide.
