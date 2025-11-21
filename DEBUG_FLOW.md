# Debug Flow Documentation

This document explains the debug flow for the Kasioon Bot.

## Message Flow

```
User Message → Telegram Bot → AI Analysis → Marketplace Search → AI Formatting → Response
```

## Debug Logs by Step

### 1. Message Received
```
📱 [TELEGRAM] Received text message: { user_id, username, message, timestamp }
💬 [TELEGRAM] Processing text message: { user_id, message, language }
⌨️  [TELEGRAM] Sending typing indicator...
```

### 2. AI Analysis
```
🤖 [AI] Starting message analysis...
📝 [AI] Input: { message, language }
🤖 [AI-ANALYZE] Starting analysis...
📥 [AI-ANALYZE] Input: { message, language, provider }
🟢 [AI-ANALYZE] Using OpenAI GPT... (or 🔵 Anthropic)
✅ [AI-ANALYZE] OpenAI response received
📄 [AI-ANALYZE] Raw response: {...}
✅ [AI-ANALYZE] Analysis complete!
📊 [AI-ANALYZE] Extracted params: {...}
✅ [AI] Analysis complete!
📊 [AI] Extracted parameters: {...}
```

### 3. Marketplace Search
```
🔍 [SEARCH] Starting marketplace search...
📋 [SEARCH] Search parameters: {...}
💾 [SEARCH] Checking cache...
✅ [SEARCH] Cache hit! (or ❌ Cache miss)
🔄 [SEARCH] Normalizing parameters...
📋 [SEARCH] Normalized parameters: {...}
🌐 [SEARCH] Making API request...
📍 [SEARCH] API URL: ...
🔑 [SEARCH] API Key: ...
📤 [SEARCH] Request payload: {...}
✅ [SEARCH] API response received!
⏱️  [SEARCH] Request duration: ...ms
📊 [SEARCH] Response status: ...
📦 [SEARCH] Response data keys: [...]
📊 [SEARCH] Results extracted: X items
💾 [SEARCH] Caching results...
✅ [SEARCH] Search complete!
```

### 4. AI Formatting
```
📝 [AI] Formatting results for user...
📊 [AI] Formatting: { results_count, language }
📝 [AI-FORMAT] Starting result formatting...
📊 [AI-FORMAT] Input: { results_count, language, provider }
📦 [AI-FORMAT] Results data size: ... characters
🟢 [AI-FORMAT] Using OpenAI GPT... (or 🔵 Anthropic)
✅ [AI-FORMAT] OpenAI response received
✅ [AI-FORMAT] Formatting complete!
📄 [AI-FORMAT] Formatted message length: ...
```

### 5. Sending Response
```
✅ [TELEGRAM] Sending response: { user_id, results_count, message_length }
📤 [TELEGRAM] Splitting message into X chunks (if needed)
```

## Error Logs

### AI Analysis Error
```
❌ [AI-ANALYZE] Error analyzing message: { message, stack }
```

### Search Error
```
❌ [SEARCH] Error searching marketplace: { message, code, status, responseData }
📄 [SEARCH] Error response: { status, headers, data }
```

### Formatting Error
```
❌ [AI-FORMAT] Error formatting results: { message, stack }
🔄 [AI-FORMAT] Falling back to simple formatting...
```

### General Error
```
❌ [ERROR] Error in handleTextMessage: { message, stack, user_id }
```

## Viewing Logs

### PM2 Logs
```bash
pm2 logs kasioon-bot
pm2 logs kasioon-bot --lines 100
```

### Follow Logs in Real-time
```bash
pm2 logs kasioon-bot --lines 0
```

### Filter by Step
```bash
# AI Analysis logs
pm2 logs kasioon-bot | grep "\[AI"

# Search logs
pm2 logs kasioon-bot | grep "\[SEARCH"

# Telegram logs
pm2 logs kasioon-bot | grep "\[TELEGRAM"
```

## Debug Checklist

When debugging, check:

1. ✅ Message received? → Look for `📱 [TELEGRAM] Received text message`
2. ✅ AI analysis started? → Look for `🤖 [AI] Starting message analysis`
3. ✅ Parameters extracted? → Look for `📊 [AI] Extracted parameters`
4. ✅ Search started? → Look for `🔍 [SEARCH] Starting marketplace search`
5. ✅ API called? → Look for `🌐 [SEARCH] Making API request`
6. ✅ Results received? → Look for `✅ [SEARCH] API response received`
7. ✅ Formatting started? → Look for `📝 [AI] Formatting results`
8. ✅ Response sent? → Look for `✅ [TELEGRAM] Sending response`

## Common Issues

### No message received
- Check if bot is running: `pm2 status`
- Check if webhook is deleted (for polling mode)
- Check bot token in .env

### AI analysis fails
- Check API keys: `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`
- Check provider setting: `AI_PROVIDER` in .env
- Look for error logs: `❌ [AI-ANALYZE]`

### Search fails
- Check API configuration: `KASIOON_API_URL` and `KASIOON_API_KEY`
- Check network connectivity
- Look for error logs: `❌ [SEARCH]`

### No response sent
- Check if formatting completed
- Check message length (Telegram limit: 4096 chars)
- Look for error logs: `❌ [ERROR]`

