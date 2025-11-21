const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
const logger = require('../../utils/logger');
const marketplaceSearch = require('../search/marketplaceSearch');

/**
 * Detect language from text message
 * Returns 'ar' if Arabic characters are detected, 'en' otherwise
 * @param {string} text - Text to analyze
 * @returns {string} - 'ar' or 'en'
 */
function detectLanguage(text) {
  if (!text || typeof text !== 'string') {
    return 'ar'; // Default to Arabic
  }
  
  // Check for Arabic characters (Unicode range: \u0600-\u06FF)
  const arabicPattern = /[\u0600-\u06FF]/;
  const hasArabic = arabicPattern.test(text);
  
  // Count Arabic vs English characters
  const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const englishChars = (text.match(/[a-zA-Z]/g) || []).length;
  
  // If Arabic characters are present and more than 30% of the text, consider it Arabic
  if (hasArabic && arabicChars > text.length * 0.1) {
    return 'ar';
  }
  
  // If mostly English characters, consider it English
  if (englishChars > text.length * 0.5) {
    return 'en';
  }
  
  // Default to Arabic if uncertain
  return 'ar';
}

class AIAgent {
  constructor() {
    this.openai = process.env.OPENAI_API_KEY ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    }) : null;

    this.anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    }) : null;

    this.provider = process.env.AI_PROVIDER || 'openai'; // 'openai' or 'anthropic'
    
    // Model configuration - use environment variable or fallback to accessible models
    this.openaiModel = process.env.OPENAI_MODEL || 'gpt-5-mini'; // Default to gpt-5-mini (more accessible)
    this.anthropicModel = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';
    
    console.log('🤖 [AI] AI Agent initialized:', {
      provider: this.provider,
      openaiModel: this.openaiModel,
      anthropicModel: this.anthropicModel,
      hasOpenAI: !!this.openai,
      hasAnthropic: !!this.anthropic
    });
  }

  /**
   * Analyze message and extract search parameters
   * @param {string} message - User message
   * @param {string} language - Message language (ar/en)
   * @returns {Promise<Object>} Extracted search parameters
   */
  async analyzeMessage(message, language = 'ar') {
    try {
      console.log('🤖 [AI-ANALYZE] Starting analysis...');
      console.log('📥 [AI-ANALYZE] Input:', {
        message: message,
        language: language,
        provider: this.provider
      });
      
      // Step 1: Fetch root categories first
      console.log('📂 [AI-ANALYZE] Fetching root categories...');
      let categories = [];
      try {
        categories = await marketplaceSearch.getCategories();
        console.log('✅ [AI-ANALYZE] Categories fetched:', categories.length, 'categories');
        console.log('📋 [AI-ANALYZE] Available categories:', categories.map(c => ({
          slug: c.slug,
          nameEn: c.nameEn,
          nameAr: c.nameAr
        })));
      } catch (categoryError) {
        console.warn('⚠️  [AI-ANALYZE] Failed to fetch categories, continuing without category validation:', categoryError.message);
      }
      
      // Detect language from message if not provided
      const detectedLanguage = language || detectLanguage(message);
      console.log('🌐 [AI-ANALYZE] Language detection:', {
        provided: language,
        detected: detectedLanguage,
        message_preview: message.substring(0, 50)
      });
      
      // Build category list for AI prompt
      // Note: API returns 'name' field which is in the requested language (ar/en)
      let categoryList = '';
      if (categories.length > 0) {
        const categoryNames = categories.map(cat => {
          // Use 'name' field which is already in the correct language
          const name = cat.name || cat.nameAr || cat.nameEn || cat.slug;
          return `- ${cat.slug} (${name})`;
        }).join('\n');
        categoryList = `\n\nAvailable categories (use the exact slug):\n${categoryNames}\n\nIMPORTANT: You MUST use one of these exact category slugs. If the user's intent doesn't match any category, set category to null.`;
      } else {
        categoryList = '\n\nCommon categories: vehicles, real-estate, electronics, furniture, fashion, services';
      }
      
      const systemPrompt = `You are an AI assistant helping users search for items on kasioon.com marketplace in Syria.${categoryList}

IMPORTANT: The user's message is in ${detectedLanguage === 'ar' ? 'Arabic' : 'English'}. Extract search parameters from the user's message and return them in JSON format.

Extract the following parameters if mentioned:
- city: The city where they want to search (e.g., Aleppo, Damascus, Homs, Latakia)
- category: Main category slug (MUST match one of the available category slugs exactly, or null if no match)
- keywords: General search keywords (extract from user message)
- minPrice: Minimum price
- maxPrice: Maximum price
- condition: Item condition (new, used)

For vehicles specifically, also extract:
- carBrand: Car brand/make (e.g., Toyota, BMW, Mercedes)
- carModel: Specific car model (e.g., Corolla, Camry, 320i)
- minYear: Minimum year
- maxYear: Maximum year
- fuelType: Fuel type (petrol, diesel, electric, hybrid)
- transmission: Transmission type (manual, automatic)

Return ONLY a valid JSON object with the extracted parameters. If a parameter is not mentioned, omit it. The category field MUST be one of the available category slugs or null.

Examples:
User: "أريد سيارة تويوتا في حلب"
Response: {"city": "Aleppo", "category": "vehicles", "carBrand": "Toyota", "keywords": "سيارة تويوتا"}

User: "شقة للبيع في دمشق"
Response: {"city": "Damascus", "category": "real-estate", "keywords": "شقة للبيع"}

User: "لابتوب مستعمل"
Response: {"category": "electronics", "keywords": "لابتوب", "condition": "used"}`;

      let extractedParams;

      if (this.provider === 'anthropic' && this.anthropic) {
        console.log('🔵 [AI-ANALYZE] Using Anthropic Claude...');
        console.log('🤖 [AI-ANALYZE] Model:', this.anthropicModel);
        const response = await this.anthropic.messages.create({
          model: this.anthropicModel,
          max_tokens: 1024,
          messages: [
            {
              role: 'user',
              content: `${systemPrompt}\n\nUser message: "${message}"`
            }
          ]
        });

        console.log('✅ [AI-ANALYZE] Anthropic response received');
        const content = response.content[0].text;
        console.log('📄 [AI-ANALYZE] Raw response:', content);
        extractedParams = JSON.parse(content);

      } else if (this.openai) {
        console.log('🟢 [AI-ANALYZE] Using OpenAI GPT...');
        console.log('🤖 [AI-ANALYZE] Model:', this.openaiModel);
        
        try {
          // Build request parameters
          const requestParams = {
            model: this.openaiModel,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: message }
            ],
            response_format: { type: 'json_object' }
          };
          
          // Some models (like gpt-5-nano) don't support custom temperature
          // Only add temperature if model supports it
          const modelsWithoutTemperature = ['gpt-5-nano'];
          if (!modelsWithoutTemperature.includes(this.openaiModel)) {
            requestParams.temperature = 0.3;
          } else {
            console.log('⚠️  [AI-ANALYZE] Model does not support custom temperature, using default');
          }
          
          const response = await this.openai.chat.completions.create(requestParams);

          console.log('✅ [AI-ANALYZE] OpenAI response received');
          const rawContent = response.choices[0].message.content;
          console.log('📄 [AI-ANALYZE] Raw response:', rawContent);
          extractedParams = JSON.parse(rawContent);
        } catch (modelError) {
          // Check if it's a temperature error - retry without temperature
          if (modelError.message && modelError.message.includes('temperature') && 
              (modelError.message.includes('does not support') || modelError.message.includes('Unsupported value'))) {
            console.warn('⚠️  [AI-ANALYZE] Temperature not supported, retrying without temperature...');
            try {
              const response = await this.openai.chat.completions.create({
                model: this.openaiModel,
                messages: [
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: message }
                ],
                response_format: { type: 'json_object' }
                // No temperature parameter
              });
              
              console.log('✅ [AI-ANALYZE] Retry without temperature succeeded!');
              const rawContent = response.choices[0].message.content;
              console.log('📄 [AI-ANALYZE] Raw response:', rawContent);
              extractedParams = JSON.parse(rawContent);
            } catch (retryError) {
              console.error('❌ [AI-ANALYZE] Retry also failed:', retryError.message);
              throw modelError; // Throw original error
            }
          }
          // If model access error, try fallback models
          else if (modelError.message && modelError.message.includes('does not have access to model')) {
            console.warn('⚠️  [AI-ANALYZE] Model access error, trying fallback models...');
            const fallbackModels = ['gpt-5-mini', 'gpt-3.5-turbo', 'gpt-4'];
            
            for (const fallbackModel of fallbackModels) {
              if (fallbackModel === this.openaiModel) continue; // Skip if already tried
              
              try {
                console.log(`🔄 [AI-ANALYZE] Trying fallback model: ${fallbackModel}`);
                
                const fallbackParams = {
                  model: fallbackModel,
                  messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: message }
                  ],
                  response_format: { type: 'json_object' }
                };
                
                // Only add temperature if model supports it
                const modelsWithoutTemperature = ['gpt-5-nano'];
                if (!modelsWithoutTemperature.includes(fallbackModel)) {
                  fallbackParams.temperature = 0.3;
                }
                
                const response = await this.openai.chat.completions.create(fallbackParams);
                
                console.log(`✅ [AI-ANALYZE] Fallback model ${fallbackModel} worked!`);
                const rawContent = response.choices[0].message.content;
                extractedParams = JSON.parse(rawContent);
                break; // Success, exit loop
              } catch (fallbackError) {
                console.warn(`❌ [AI-ANALYZE] Fallback model ${fallbackModel} also failed:`, fallbackError.message);
                if (fallbackModel === fallbackModels[fallbackModels.length - 1]) {
                  // Last fallback failed, throw original error
                  throw modelError;
                }
              }
            }
          } else {
            throw modelError;
          }
        }
      } else {
        console.error('❌ [AI-ANALYZE] No AI provider configured!');
        throw new Error('No AI provider configured');
      }

      console.log('✅ [AI-ANALYZE] Analysis complete!');
      console.log('📊 [AI-ANALYZE] Extracted params (before validation):', JSON.stringify(extractedParams, null, 2));
      
      // Step 2: Validate category against available categories
      if (extractedParams.category && categories.length > 0) {
        const categorySlug = extractedParams.category.toLowerCase();
        const validCategory = categories.find(cat => 
          cat.slug.toLowerCase() === categorySlug ||
          cat.name?.toLowerCase() === categorySlug ||
          cat.nameEn?.toLowerCase() === categorySlug ||
          cat.nameAr?.toLowerCase() === categorySlug ||
          cat.name === extractedParams.category ||
          cat.nameAr === extractedParams.category ||
          cat.nameEn?.toLowerCase() === categorySlug
        );
        
        if (validCategory) {
          // Use the exact slug from the API
          extractedParams.category = validCategory.slug;
          extractedParams.categoryValidated = true;
          console.log('✅ [AI-ANALYZE] Category validated:', {
            original: extractedParams.category,
            validated: validCategory.slug,
            name: validCategory.name || validCategory.nameAr || validCategory.nameEn
          });
        } else {
          console.warn('⚠️  [AI-ANALYZE] Category not found in available categories:', extractedParams.category);
          console.warn('⚠️  [AI-ANALYZE] Available categories:', categories.map(c => `${c.slug} (${c.name})`).join(', '));
          // Keep the category but mark as potentially invalid - let the API handle it
          extractedParams.categoryValidated = false;
        }
      } else if (extractedParams.category && categories.length === 0) {
        console.log('ℹ️  [AI-ANALYZE] Categories not available, using extracted category as-is:', extractedParams.category);
      }
      
      // Step 3: Ensure keywords are extracted from the message
      if (!extractedParams.keywords && message) {
        // If no keywords extracted but we have a message, use the message as keywords
        // But only if category is not set (general search)
        if (!extractedParams.category) {
          extractedParams.keywords = message.trim();
          console.log('📝 [AI-ANALYZE] No keywords extracted, using message as keywords:', extractedParams.keywords);
        }
      }
      
      console.log('📊 [AI-ANALYZE] Final extracted params:', JSON.stringify(extractedParams, null, 2));
      logger.info('Message analyzed successfully', { extractedParams });
      return extractedParams;

    } catch (error) {
      console.error('❌ [AI-ANALYZE] Error analyzing message:', {
        message: error.message,
        stack: error.stack
      });
      logger.error('Error analyzing message:', error);
      throw error;
    }
  }

  /**
   * Format search results into a user-friendly message
   * @param {Array} results - Search results
   * @param {string} language - Response language (will be detected from user message if not provided)
   * @param {string} userMessage - Optional: original user message for language detection
   * @returns {Promise<string>} Formatted message
   */
  async formatResults(results, language = 'ar', userMessage = null) {
    try {
      // Detect language from user message if provided, otherwise use provided language
      const detectedLanguage = userMessage ? detectLanguage(userMessage) : language;
      console.log('📝 [AI-FORMAT] Starting result formatting...');
      console.log('📊 [AI-FORMAT] Input:', {
        results_count: results?.length || 0,
        provided_language: language,
        detected_language: detectedLanguage,
        provider: this.provider
      });
      
      if (!results || results.length === 0) {
        console.log('⚠️  [AI-FORMAT] No results to format');
        return detectedLanguage === 'ar' 
          ? 'عذراً، لم أجد أي نتائج تطابق بحثك. يرجى المحاولة مرة أخرى بمعايير مختلفة.'
          : 'Sorry, I couldn\'t find any results matching your search. Please try again with different criteria.';
      }

      // Add listing URLs and photo URLs to each result before formatting
      const enrichedResults = results.slice(0, 10).map(result => {
        const enriched = { ...result };
        
        // Add listing URL if id exists
        if (result.id) {
          enriched.listingUrl = `https://www.kasioon.com/listing/${result.id}/`;
        }
        
        // Add first photo URL if images exist
        if (result.images && Array.isArray(result.images) && result.images.length > 0) {
          // Handle both string URLs and objects with url property
          const firstImage = result.images[0];
          enriched.photoUrl = typeof firstImage === 'string' ? firstImage : (firstImage.url || firstImage);
        } else if (result.image) {
          // Fallback for single image field
          enriched.photoUrl = typeof result.image === 'string' ? result.image : (result.image.url || result.image);
        }
        
        return enriched;
      });

      // Create a more generic prompt that works for all categories
      // IMPORTANT: Always respond in the same language as the user's original message
      const systemPrompt = detectedLanguage === 'ar'
        ? `أنت مساعد ذكي يساعد المستخدمين في البحث عن المنتجات في سوق kasioon.com. 

قم بتنسيق نتائج البحث التالية بشكل واضح وجذاب باللغة العربية فقط. استجب دائماً بالعربية.

اعرض لكل نتيجة:
- العنوان/الاسم
- الفئة (سيارات، عقارات، إلكترونيات، إلخ)
- السعر (إن وجد)
- الموقع/المدينة (إن وجد)
- الخصائص المهمة (الغرف، المساحة، العلامة التجارية، إلخ)
- رابط الإعلان (listingUrl) - يجب تضمينه دائماً
- رابط الصورة (photoUrl) - إذا كان متوفراً

استخدم الإيموجي لجعل الرسالة أكثر جاذبية. كن واضحاً ومختصراً. تأكد من تضمين رابط الإعلان لكل نتيجة.`
        : `You are an AI assistant helping users search for products on kasioon.com marketplace. 

Format the following search results in a clear and attractive way in English only. Always respond in English.

For each result, show:
- Title/Name
- Category (vehicles, real estate, electronics, etc.)
- Price (if available)
- Location/City (if available)
- Important attributes (rooms, area, brand, etc.)
- Listing URL (listingUrl) - MUST be included for every result
- Photo URL (photoUrl) - if available

Use emojis to make the message more engaging. Be clear and concise. Make sure to include the listing URL for every result.`;

      const resultsData = JSON.stringify(enrichedResults, null, 2); // Limit to top 10 results
      console.log('📦 [AI-FORMAT] Results data size:', resultsData.length, 'characters');

      let formattedMessage;

      if (this.provider === 'anthropic' && this.anthropic) {
        console.log('🔵 [AI-FORMAT] Using Anthropic Claude...');
        console.log('🤖 [AI-FORMAT] Model:', this.anthropicModel);
        
        const response = await this.anthropic.messages.create({
          model: this.anthropicModel,
          max_tokens: 2048,
          messages: [
            {
              role: 'user',
              content: `${systemPrompt}\n\nSearch Results:\n${resultsData}`
            }
          ]
        });

        console.log('✅ [AI-FORMAT] Anthropic response received');
        formattedMessage = response.content[0].text;

      } else if (this.openai) {
        console.log('🟢 [AI-FORMAT] Using OpenAI GPT...');
        console.log('🤖 [AI-FORMAT] Model:', this.openaiModel);
        
        try {
          const response = await this.openai.chat.completions.create({
            model: this.openaiModel,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Search Results:\n${resultsData}` }
            ],
            temperature: 0.7
          });

          console.log('✅ [AI-FORMAT] OpenAI response received');
          formattedMessage = response.choices[0].message.content;
        } catch (modelError) {
          // Check if it's a temperature error - retry without temperature
          if (modelError.message && modelError.message.includes('temperature') && 
              modelError.message.includes('does not support')) {
            console.warn('⚠️  [AI-FORMAT] Temperature not supported, retrying without temperature...');
            try {
              const response = await this.openai.chat.completions.create({
                model: this.openaiModel,
                messages: [
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: `Search Results:\n${resultsData}` }
                ]
                // No temperature parameter
              });
              
              console.log('✅ [AI-FORMAT] Retry without temperature succeeded!');
              formattedMessage = response.choices[0].message.content;
            } catch (retryError) {
              console.error('❌ [AI-FORMAT] Retry also failed:', retryError.message);
              throw modelError; // Throw original error
            }
          }
          // If model access error, try fallback models
          else if (modelError.message && modelError.message.includes('does not have access to model')) {
            console.warn('⚠️  [AI-FORMAT] Model access error, trying fallback models...');
            const fallbackModels = ['gpt-5-mini', 'gpt-3.5-turbo', 'gpt-4'];
            
            for (const fallbackModel of fallbackModels) {
              if (fallbackModel === this.openaiModel) continue; // Skip if already tried
              
              try {
                console.log(`🔄 [AI-FORMAT] Trying fallback model: ${fallbackModel}`);
                const response = await this.openai.chat.completions.create({
                  model: fallbackModel,
                  messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Search Results:\n${resultsData}` }
                  ],
                  temperature: 0.7
                });
                
                console.log(`✅ [AI-FORMAT] Fallback model ${fallbackModel} worked!`);
                formattedMessage = response.choices[0].message.content;
                break; // Success, exit loop
              } catch (fallbackError) {
                console.warn(`❌ [AI-FORMAT] Fallback model ${fallbackModel} also failed:`, fallbackError.message);
                if (fallbackModel === fallbackModels[fallbackModels.length - 1]) {
                  // Last fallback failed, throw original error
                  throw modelError;
                }
              }
            }
          } else {
            throw modelError;
          }
        }
      }

      console.log('✅ [AI-FORMAT] Formatting complete!');
      console.log('📄 [AI-FORMAT] Formatted message length:', formattedMessage?.length || 0);
      return formattedMessage;

    } catch (error) {
      console.error('❌ [AI-FORMAT] Error formatting results:', {
        message: error.message,
        stack: error.stack
      });
      console.log('🔄 [AI-FORMAT] Falling back to simple formatting...');
      logger.error('Error formatting results:', error);
      // Fallback to simple formatting
      const fallbackLanguage = userMessage ? detectLanguage(userMessage) : language;
      return this.simpleFormat(results, fallbackLanguage);
    }
  }

  /**
   * Simple fallback formatting
   */
  simpleFormat(results, language = 'ar') {
    if (language === 'ar') {
      let message = `🚗 وجدت ${results.length} نتيجة:\n\n`;
      results.slice(0, 10).forEach((item, index) => {
        const title = item.title || item.name || `${item.brand || ''} ${item.model || ''}`.trim() || 'إعلان';
        message += `${index + 1}. ${title}\n`;
        
        if (item.brand || item.model) {
          message += `   🏷️ ${item.brand || ''} ${item.model || ''}\n`;
        }
        if (item.year) {
          message += `   📅 السنة: ${item.year}\n`;
        }
        if (item.attributes?.price || item.price) {
          message += `   💰 السعر: ${item.attributes?.price || item.price}\n`;
        }
        if (item.location?.cityName || item.city) {
          message += `   📍 المدينة: ${item.location?.cityName || item.city}\n`;
        }
        
        // Add listing URL
        if (item.id) {
          message += `   🔗 الرابط: https://www.kasioon.com/listing/${item.id}/\n`;
        }
        
        // Add photo URL if available
        if (item.images && Array.isArray(item.images) && item.images.length > 0) {
          const firstImage = item.images[0];
          const photoUrl = typeof firstImage === 'string' ? firstImage : (firstImage.url || firstImage);
          message += `   📷 الصورة: ${photoUrl}\n`;
        } else if (item.image) {
          const photoUrl = typeof item.image === 'string' ? item.image : (item.image.url || item.image);
          message += `   📷 الصورة: ${photoUrl}\n`;
        }
        
        message += `\n`;
      });
      return message;
    } else {
      let message = `🚗 Found ${results.length} results:\n\n`;
      results.slice(0, 10).forEach((item, index) => {
        const title = item.title || item.name || `${item.brand || ''} ${item.model || ''}`.trim() || 'Listing';
        message += `${index + 1}. ${title}\n`;
        
        if (item.brand || item.model) {
          message += `   🏷️ ${item.brand || ''} ${item.model || ''}\n`;
        }
        if (item.year) {
          message += `   📅 Year: ${item.year}\n`;
        }
        if (item.attributes?.price || item.price) {
          message += `   💰 Price: ${item.attributes?.price || item.price}\n`;
        }
        if (item.location?.cityName || item.city) {
          message += `   📍 City: ${item.location?.cityName || item.city}\n`;
        }
        
        // Add listing URL
        if (item.id) {
          message += `   🔗 Link: https://www.kasioon.com/listing/${item.id}/\n`;
        }
        
        // Add photo URL if available
        if (item.images && Array.isArray(item.images) && item.images.length > 0) {
          const firstImage = item.images[0];
          const photoUrl = typeof firstImage === 'string' ? firstImage : (firstImage.url || firstImage);
          message += `   📷 Photo: ${photoUrl}\n`;
        } else if (item.image) {
          const photoUrl = typeof item.image === 'string' ? item.image : (item.image.url || item.image);
          message += `   📷 Photo: ${photoUrl}\n`;
        }
        
        message += `\n`;
      });
      return message;
    }
  }

  /**
   * Transcribe voice message to text
   * @param {Buffer} audioBuffer - Audio file buffer
   * @returns {Promise<string>} Transcribed text
   */
  async transcribeAudio(audioBuffer) {
    try {
      if (!this.openai) {
        throw new Error('OpenAI is required for audio transcription');
      }

      // Create a File-like object from buffer
      const file = new File([audioBuffer], 'audio.ogg', { type: 'audio/ogg' });

      const response = await this.openai.audio.transcriptions.create({
        file: file,
        model: 'whisper-1',
        language: 'ar' // Arabic by default, Whisper auto-detects
      });

      logger.info('Audio transcribed successfully');
      return response.text;

    } catch (error) {
      logger.error('Error transcribing audio:', error);
      throw error;
    }
  }
}

module.exports = new AIAgent();

