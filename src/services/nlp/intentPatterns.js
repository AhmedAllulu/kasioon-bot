/**
 * Intent Patterns Library - Enhanced Version
 * مكتبة أنماط النوايا المحسّنة - تحتوي على جميع الأنماط المستخدمة لتصنيف نوايا المستخدمين
 *
 * @module intentPatterns
 */

module.exports = {
  /**
   * أنماط التحية
   * Greeting patterns
   */
  greeting: {
    patterns: [
      // تحيات عربية
      /^(مرحبا|مرحباً|أهلا|أهلاً|اهلا|اهلين|هلا|هلو|هاي|السلام|سلام)$/i,
      /^(مساء|صباح|يوم|نهار) (الخير|النور|الورد|الفل|السعادة|البركة)$/i,
      /^السلام عليكم( ورحمة الله)?( وبركاته)?$/i,
      /^(كيف|شلون|شو|ايش|وش|كيفك|شخبارك) (حالك|الحال|حالكم|الأحوال|صحتك|أخبارك|اخبارك)[\?؟]?$/i,
      /^(يا هلا|ياهلا|يا مرحبا|نورت|نورتي|حياك|حياكم)$/i,
      /^(هلا|أهلين|مراحب|هلوو|هااي|يو)$/i,
      /^(كيفك|كيف حالك|شو الأخبار|ايش الاخبار|شخبار)[\?؟]?$/i,
      /^(الحمد لله|بخير|تمام|كويس|زين)$/i,
      
      // تحيات إنجليزية
      /^(hello|hi|hey|yo|sup|heya|hiya|greetings|salutations)$/i,
      /^good (morning|afternoon|evening|day|night)$/i,
      /^(how are you|how r u|how are ya|how you doing|how do you do)[\?]?$/i,
      /^(what'?s up|whats up|wassup|wazzup|what is up)[\?]?$/i,
      /^(howdy|aloha|bonjour|hola)$/i,
      /^nice to (meet|see) you$/i,
    ],
    maxLength: 50,
    minWords: 1,
    maxWords: 5
  },

  /**
   * أنماط طلب المساعدة
   * Help request patterns
   */
  help: {
    patterns: [
      // طلب مساعدة عربي
      /ممكن (تساعدني|تساعد|تساعديني|مساعدة|مساعده|مساعدتي)/i,
      /(ساعدني|ساعديني|ساعدوني|محتاج مساعدة|محتاجة مساعدة|محتاج مساعده|بحاجة لمساعدة)/i,
      /كيف (أبحث|ابحث|استخدم|أستخدم|اقدر|أقدر|أستطيع|استطيع|اعمل|أعمل|اسوي|أسوي)/i,
      /(شو|ايش|وش|ويش) (بتقدر|تقدر|تستطيع|تعرف|بتعرف) (تسوي|تعمل|تساوي|تسويلي)[\?؟]?/i,
      /(شو|ايش|وش|ويش) (الخدمات|الخدمة|الميزات|المميزات|الفوائد|الإمكانيات)[\?؟]?/i,
      /وين (الاقي|القى|أجد|اجد|ألاقي|القي|أحصل)[\?؟]?/i,
      /(شرح|اشرح|وضح|فسر|بين|علمني|عرفني|دلني)/i,
      /(مش|مو|ما) (فاهم|فاهمة|عارف|عارفة|مستوعب|مستوعبة)/i,
      /(فهمني|علمني|وريني|ورني|اشرحلي|وضحلي)/i,
      /(دليل|مساعدة|إرشادات|توجيهات|تعليمات)/i,
      
      // طلب مساعدة إنجليزي
      /can you (help|assist|support)( me)?[\?]?/i,
      /(help|assist|support|guide) me[\?]?/i,
      /(i need|need|i want) (help|assistance|support|guidance)[\?]?/i,
      /how (do i|can i|to|could i|would i|should i)/i,
      /what can you (do|help with|assist with)[\?]?/i,
      /how does (this|it|that) work[\?]?/i,
      /(explain|show|tell|teach) me/i,
      /(i don'?t|don'?t|do not) (understand|know|get it)/i,
      /could you (explain|help|show|tell)/i,
      /(guide|tutorial|manual|instructions)/i,
    ]
  },

  /**
   * أنماط نية البحث
   * Search intent patterns
   */
  search: {
    patterns: [
      // نوايا بحث واضحة - عربي
      /(ابحث|أبحث|دور|دوري|دورلي|دورلي|بحثي|ابغى|ابغا|أبغى|بدور|بفتش) (عن|على|ل|لـ)?/i,
      /(دورلي|دوري|دور) (على|عن|ل|لـ) .+/i,
      /(بدي|بدى|أريد|اريد|عايز|عاوز|ودي|أبي|ابي|نفسي|حابب) (أشتري|اشتري|ابيع|أبيع|اشوف|أشوف)?/i,
      /(في|عندك|عندكم|لديك|لديكم|موجود عندك|متوفر عندك) .+[\?؟]/i,
      /(موجود|متوفر|متاح|في عندك|فيه) .+[\?؟]/i,
      /(اعرض|اعرضي|اعرضوا|اظهر|اظهري) (لي|علي|ليا)/i,
      /(شوف|شوفي|اطلع|اطلعي|تفرج|شيك|تشيك)/i,
      /(وين|فين|أين|اين) (القى|الاقي|أجد|اجد|اشوف|أشوف)/i,
      /(عطني|اعطني|أعطني|اعطيني|وديني|ورني|وريني|خلني أشوف)/i,
      
      // نوايا بحث واضحة - إنجليزي
      /(search|find|look|looking|looking for|seek|browse) (for|at)?/i,
      /i (want|need|would like|looking for|am looking for|wanna)/i,
      /(show|display|let me see|give me|get me) (me)?/i,
      /(do you have|have you got|got any|any)/i,
      /(is there|are there|is there any|are there any)/i,
      /any .+ (available|for sale|in stock)[\?]?/i,
      /(where can i|where do i|how can i) (find|get|buy)/i,
    ],

    // كلمات مفتاحية للمنتجات - عربي
    productKeywords: [
      // مركبات
      'سيارة', 'سيارات', 'سياره', 'عربية', 'عربيه', 'عربيات', 'مركبة', 'مركبه',
      'شاحنة', 'شاحنه', 'دراجة', 'دراجه', 'موتور', 'موتوسيكل', 'باص', 'حافلة',
      'فان', 'بكب', 'بيك اب', 'جيب', 'صالون', 'سيدان', 'كوبيه', 'هاتشباك',
      'ديزل', 'بنزين', 'هايبرد', 'كهربائية', 'اوتوماتيك', 'مانيوال', 'قير',
      
      // عقارات
      'شقة', 'شقه', 'شقق', 'منزل', 'بيت', 'بيوت', 'فيلا', 'ڤيلا', 'فلل', 'أرض', 'ارض', 'اراضي',
      'عقار', 'عقارات', 'محل', 'محلات', 'مكتب', 'مكاتب', 'مستودع', 'مخزن', 'غرفة', 'غرف', 'استديو',
      'دوبلكس', 'تريبلكس', 'بنتهاوس', 'روف', 'تاون هاوس', 'عمارة', 'بناية', 'مبنى',
      'استراحة', 'مزرعة', 'قصر', 'شاليه', 'كومباوند',
      
      // إلكترونيات
      'موبايل', 'جوال', 'هاتف', 'تلفون', 'آيفون', 'ايفون', 'أيفون', 'سامسونج', 'هواوي', 'شاومي',
      'لابتوب', 'لاب توب', 'نوت بوك', 'كمبيوتر', 'حاسوب', 'كمبيوتر مكتبي', 'PC', 'ماك', 'ايماك',
      'تابلت', 'لوحي', 'آيباد', 'ايباد', 'جالكسي تاب',
      'تلفزيون', 'تلفاز', 'شاشة', 'تلفزيون ذكي', 'سمارت تي في', 
      'كاميرا', 'كاميرات', 'كانون', 'نيكون', 'سوني',
      'سماعات', 'سماعة', 'ايربودز', 'هيدفون', 'سبيكر', 'مكبر صوت',
      'بلايستيشن', 'اكس بوكس', 'نينتندو', 'قيمنق', 'جيمنج',
      'راوتر', 'مودم', 'ساعة ذكية', 'سمارت واتش', 'ابل واتش',
      
      // أثاث وديكور
      'أثاث', 'اثاث', 'فرش', 'مفروشات', 'كنب', 'كنبة', 'صوفا', 'سرير', 'سراير',
      'طاولة', 'طاولات', 'طربيزة', 'طربيزات', 'طربيزه', 'ترابيز', 'كرسي', 'كراسي',
      'خزانة', 'خزاين', 'دولاب', 'دواليب', 'رف', 'رفوف', 'مكتب', 'مكاتب', 'مكتبة',
      'ديكور', 'ديكورات', 'لوحة', 'لوحات', 'مرآة', 'مرايا', 'ستارة', 'ستاير', 'سجادة', 'سجاد',
      'إنارة', 'إضاءة', 'لمبة', 'ثريا', 'نجفة', 'أباجورة', 'ابجورة',
      
      // ملابس وإكسسوارات
      'ملابس', 'فستان', 'فساتين', 'بنطلون', 'بنطلونات', 'جينز', 'دينم',
      'قميص', 'قمصان', 'بلوزة', 'تيشيرت', 'تي شيرت', 'بولو', 'هودي',
      'جاكيت', 'معطف', 'كوت', 'سترة', 'بدلة', 'عباية', 'عبايات', 'فروة',
      'حذاء', 'حزاء', 'أحذية', 'جزمة', 'جزم', 'نعال', 'صندل', 'كوتشي', 'سنيكرز',
      'شنطة', 'شنط', 'حقيبة', 'حقائب', 'محفظة', 'محافظ', 'جزدان',
      'ساعة', 'ساعات', 'اكسسوار', 'إكسسوار', 'اكسسوارات', 'مجوهرات',
      'نظارة', 'نظارات', 'نظارة شمس', 'عطر', 'عطور', 'بخور',
      
      // أجهزة منزلية
      'ثلاجة', 'فريزر', 'غسالة', 'نشافة', 'مجفف', 'ميكرويف', 'فرن', 'غاز',
      'مكيف', 'تكييف', 'مروحة', 'دفاية', 'سخان', 'كولر',
      'مكنسة', 'مكنسة كهربائية', 'خلاط', 'عصارة', 'قلاية', 'قلاية هوائية',
      'ماكينة قهوة', 'ماكينة نسكافيه', 'محمصة', 'تيفال',
      
      // ألعاب وترفيه
      'لعبة', 'العاب', 'ألعاب', 'دمية', 'دمى', 'عروسة', 'لعب أطفال',
      'دراجة أطفال', 'سكوتر', 'مرجيحة', 'زحليقة', 'نطيطة',
      
      // كتب وقرطاسية
      'كتاب', 'كتب', 'رواية', 'روايات', 'مجلة', 'مجلات', 'قصة', 'قصص',
      'قرطاسية', 'دفتر', 'دفاتر', 'قلم', 'أقلام', 'مقلمة',
      
      // رياضة ولياقة
      'دراجة هوائية', 'بايسكل', 'جيم', 'معدات رياضية', 'اوزان', 'دمبل',
      'جهاز رياضي', 'مشاية', 'تريد ميل', 'عجلة', 'يوغا', 'رياضة',
      
      // حيوانات أليفة
      'قط', 'قطة', 'قطط', 'كلب', 'كلاب', 'عصفور', 'عصافير', 'ببغاء', 'سمك',
      'حيوان أليف', 'حيوانات أليفة', 'أقفاص', 'أكل حيوانات',
      
      // خدمات
      'توصيل', 'نقل', 'شحن', 'تركيب', 'صيانة', 'تصليح', 'إصلاح',
      'تنظيف', 'تعقيم', 'مكافحة حشرات', 'سباكة', 'كهرباء', 'نجارة',
      'شركة', 'شركات', 'مؤسسة', 'مؤسسات', 'مكتب', 'مكاتب', 'استوديو',
      'برمجة', 'تطوير', 'تصميم', 'جرافيك', 'مونتاج', 'تصوير', 'إنتاج',
      'استشارات', 'استشارة', 'خدمات', 'خدمة', 'خدماتي', 'خدماتية',
      
      // إنجليزي - مركبات
      'car', 'cars', 'vehicle', 'vehicles', 'truck', 'trucks', 'van', 'vans',
      'motorcycle', 'bike', 'motorbike', 'scooter', 'suv', 'sedan', 'coupe',
      'pickup', 'automatic', 'manual', 'diesel', 'petrol', 'hybrid', 'electric',
      
      // إنجليزي - عقارات
      'apartment', 'apartments', 'flat', 'flats', 'house', 'houses', 'villa', 'villas',
      'land', 'property', 'properties', 'office', 'offices', 'shop', 'shops', 'store',
      'studio', 'duplex', 'penthouse', 'townhouse', 'building', 'room', 'rooms',
      
      // إنجليزي - إلكترونيات
      'phone', 'phones', 'mobile', 'smartphone', 'iphone', 'samsung', 'huawei', 'xiaomi',
      'laptop', 'laptops', 'notebook', 'computer', 'pc', 'desktop', 'mac', 'imac',
      'tablet', 'ipad', 'galaxy tab', 'tv', 'television', 'smart tv', 'screen', 'monitor',
      'camera', 'cameras', 'canon', 'nikon', 'sony', 'headphones', 'earbuds', 'airpods',
      'speaker', 'speakers', 'playstation', 'ps5', 'xbox', 'nintendo', 'gaming',
      'router', 'smartwatch', 'apple watch',
      
      // إنجليزي - أثاث
      'furniture', 'sofa', 'sofas', 'couch', 'bed', 'beds', 'table', 'tables',
      'chair', 'chairs', 'desk', 'desks', 'closet', 'wardrobe', 'shelf', 'shelves',
      'decor', 'decoration', 'mirror', 'curtain', 'curtains', 'carpet', 'rug',
      
      // إنجليزي - ملابس
      'clothes', 'clothing', 'dress', 'dresses', 'pants', 'trousers', 'jeans',
      'shirt', 'shirts', 'tshirt', 't-shirt', 'blouse', 'jacket', 'coat',
      'shoes', 'sneakers', 'sandals', 'bag', 'bags', 'handbag', 'backpack',
      'watch', 'watches', 'accessories', 'jewelry', 'sunglasses', 'perfume',
      
      // إنجليزي - أجهزة منزلية
      'fridge', 'refrigerator', 'freezer', 'washing machine', 'dryer', 'microwave',
      'oven', 'air conditioner', 'ac', 'heater', 'fan', 'vacuum', 'blender',
      'coffee machine', 'toaster',
      
      // إنجليزي - أخرى
      'book', 'books', 'toys', 'games', 'sports', 'fitness', 'bicycle', 'gym',
      'pet', 'pets', 'cat', 'dog', 'bird',
      
      // إنجليزي - خدمات
      'service', 'services', 'company', 'companies', 'business', 'firm', 'office',
      'programming', 'development', 'design', 'graphic', 'editing', 'photography',
      'consulting', 'consultation', 'agency', 'studio',
    ],

    // كلمات دالة على البيع/الشراء
    transactionKeywords: [
      // عربي
      'للبيع', 'لبيع', 'بيع', 'مبيع', 'مباع',
      'للايجار', 'للإيجار', 'للتأجير', 'لليجار', 'ايجار', 'إيجار', 'تأجير',
      'مستعمل', 'مستعملة', 'مستعملات', 'يوزد', 'second hand',
      'جديد', 'جديدة', 'جدد', 'بالكرتون', 'بالكرتونة', 'zero',
      'نظيف', 'نظيفة', 'نظاف', 'نضيف', 'ممتاز', 'ممتازة', 'شبه جديد',
      'شراء', 'بشتري', 'بشترى', 'للشراء', 'اشتري', 'أشتري',
      'مزاد', 'مزادات', 'عرض', 'عروض', 'تخفيض', 'تخفيضات', 'خصم', 'تنزيلات',
      
      // إنجليزي
      'for sale', 'selling', 'sell', 'sale', 'on sale',
      'for rent', 'rental', 'rent', 'renting', 'lease', 'leasing',
      'used', 'second hand', 'secondhand', 'pre-owned',
      'new', 'brand new', 'unused', 'mint condition',
      'excellent condition', 'like new', 'barely used',
      'buying', 'buy', 'purchase', 'looking to buy',
      'auction', 'bid', 'offer', 'deal', 'discount', 'clearance',
    ],

    // كلمات دالة على السعر
    priceKeywords: [
      // عربي
      'سعر', 'اسعار', 'أسعار', 'السعر', 'الاسعار', 'الأسعار', 'بكم', 'بكام',
      'رخيص', 'رخيصة', 'رخيصه', 'ارخص', 'أرخص', 'الارخص', 'الأرخص',
      'غالي', 'غالية', 'غاليه', 'اغلى', 'أغلى', 'الأغلى',
      'ب', 'بسعر', 'بـ', 'بمبلغ', 'قيمة', 'قيمته', 'ثمن', 'ثمنه', 'تكلفة', 'تكلفته',
      'ريال', 'دولار', 'دينار', 'جنيه', 'درهم', 'ليرة', 'فلس',
      'الف', 'ألف', 'آلاف', 'مليون', 'ملايين', 'كيلو',
      'ميزانية', 'مناسب', 'معقول', 'منطقي', 'قابل للتفاوض', 'فيه تفاوض',
      
      // إنجليزي
      'price', 'prices', 'pricing', 'cost', 'costs', 'how much',
      'cheap', 'cheaper', 'cheapest', 'inexpensive', 'affordable', 'budget',
      'expensive', 'pricey', 'costly', 'premium',
      'dollar', 'dollars', 'usd', 'aed', 'sar', 'eur', 'pound',
      'thousand', 'million', 'k', 'negotiable', 'obo', 'best offer',
    ],

    // كلمات دالة على المواصفات
    specificationKeywords: [
      // عربي
      'مواصفات', 'مواصفاته', 'خصائص', 'ميزات', 'مميزات', 'وصف',
      'لون', 'ألوان', 'اللون', 'الوان',
      'حجم', 'أحجام', 'الحجم', 'مقاس', 'مقاسات', 'القياس',
      'موديل', 'موديلات', 'طراز', 'اصدار', 'إصدار', 'سنة', 'موديل',
      'حالة', 'الحالة', 'وضع', 'جودة', 'نوع', 'النوع', 'صنف',
      'كيلو', 'متر', 'كم', 'سم', 'ملم',
      
      // إنجليزي
      'specifications', 'specs', 'features', 'details', 'description',
      'color', 'colors', 'colour', 'colours',
      'size', 'sizes', 'dimension', 'dimensions',
      'model', 'version', 'year', 'edition', 'generation',
      'condition', 'quality', 'type', 'category', 'brand',
      'km', 'meter', 'cm', 'mm', 'inch', 'kg', 'gb', 'tb',
    ],
  },

  /**
   * أنماط تحسين البحث (Follow-up / Refinement)
   * Search refinement patterns
   */
  refinement: {
    patterns: [
      // تحسين عربي
      /(أرخص|ارخص|أغلى|اغلى|احسن|أحسن|افضل|أفضل) (سعر|واحد|شي|نتيجة|خيار)?/i,
      /(في|بـ|ب|من) (مدينة|منطقة|حي|مكان|منطقه) (ثانية|تانية|أخرى|اخرى|غير|ثاني)/i,
      /(غير|بدل|شيل|احذف|امسح) (الموقع|المدينة|المنطقة|السعر|الفلتر|الخيار)/i,
      /(زود|زيد|أضف|اضف|حط|ضيف|احذف|شيل|امسح) .+/i,
      /بس (في|من|ب) .+/i,
      /(المزيد|اكثر|أكثر|زيادة|زود|نتائج أكثر|خيارات أكثر)/i,
      /(اقل|أقل|اعلى|أعلى|احسن|أحسن|افضل|أفضل|اجود|أجود)/i,
      /(نفس|نفسه|مثل|زي) (الشي|الشيء|كذا|هيك) (بس|لكن|ولكن|مع)/i,
      /(لون|بلون) (ثاني|آخر|غير|مختلف)/i,
      /(اكبر|أكبر|اصغر|أصغر|أوسع|اوسع) (حجم|مساحة|مقاس)/i,
      /(اجدد|أجدد|أقدم|اقدم|أحدث|احدث) (موديل|طراز|اصدار|إصدار)/i,
      /(قريب|قريبة|بعيد|بعيدة) (من|عن|على)/i,
      
      // تحسين إنجليزي
      /(cheaper|more expensive|less expensive|lower price|higher price)/i,
      /(different|another|other|alternative) (city|location|area|place)/i,
      /(change|modify|update|remove|delete) (location|city|price|filter|option)/i,
      /(more|additional|extra|further) (results|options|choices)/i,
      /(better|best|top|premium|higher quality)/i,
      /(less|lower|smaller|larger|bigger)/i,
      /(newer|latest|older|recent)/i,
      /(same|similar) but (different|with|in|at)/i,
      /(closer|nearer|farther) (to|from)/i,
      /(add|include|exclude|remove) .+/i,
    ]
  },

  /**
   * أنماط الملاحظات والتغذية الراجعة
   * Feedback patterns
   */
  feedback: {
    patterns: [
      // إيجابية - عربي
      /^(شكرا|شكراً|ثانكس|مشكور|مشكورة|تسلم|تسلمين)$/i,
      /^(ممتاز|رائع|جميل|حلو|زين|تمام|كويس|مرة حلو|حلو كثير)$/i,
      /^(عظيم|يعطيك العافية|الله يعطيك العافية|ماشاء الله)$/i,
      /^(جزاك الله|جزاكم الله|بارك الله فيك|الله يبارك فيك)$/i,
      /^(تمام|زين|مافي مشكلة|ولا يهمك|عادي)$/i,
      /^(يسلمو|يسلمووو|الله يسلمك)$/i,
      
      // إيجابية - إنجليزي
      /^(thanks|thank you|thx|ty|tysm|thank you so much)$/i,
      /^(great|excellent|awesome|amazing|wonderful|fantastic|perfect)$/i,
      /^(good|nice|cool|sweet|brilliant|superb)$/i,
      /^(appreciate it|much appreciated|well done)$/i,
      /^(love it|i like it|exactly what i needed)$/i,
      
      // سلبية - عربي
      /^(مو منيح|مش زابط|سيء|مش كويس|مو كويس|مو تمام|مش حلو)$/i,
      /^(ما عجبني|ما عجبتني|مش عاجبني|مو عاجبني)$/i,
      /^(مافي فايدة|مافيه فايده|ما فيه فايدة|مو مفيد|مش مفيد)$/i,
      /(ما|مش|مو) (زابطة|ماشية|شغالة|صح)/i,
      /(سيئ|سيئة|وحش|وحشة|مش نافع|مو نافع)/i,
      
      // سلبية - إنجليزي
      /^(bad|not good|poor|terrible|horrible|awful)$/i,
      /^(doesn'?t work|not working|broken|useless)$/i,
      /(i don'?t like|not helpful|disappointing)/i,
    ]
  },

  /**
   * أنماط الشكر والوداع
   * Thanks and goodbye patterns
   */
  goodbye: {
    patterns: [
      // وداع عربي
      /^(مع السلامة|مع السلام|باي|باي باي|بااي|وداعا|وداعاً|سلام|سلامات)$/i,
      /^(الله معك|الله معاك|الله يحفظك|ربنا يحفظك)$/i,
      /^(يعطيك العافية|تسلم|تسلمين|مشكور|مشكورة)$/i,
      /^(خلاص|كفاية|بس|يكفي|انتهيت|انتهينا)$/i,
      /^(شكرا والله|شكراً جزيلاً|شكرا كثير|شكرا جزيلا|ألف شكر)$/i,
      /^(إلى اللقاء|الى اللقاء|نلتقي لاحقا|أراك لاحقا)$/i,
      /^(طيب شكرا|ماشي شكرا|تمام شكرا)$/i,
      
      // وداع إنجليزي
      /^(bye|goodbye|see you|see ya|cya|later|farewell)$/i,
      /^(take care|stay safe|god bless|cheers)$/i,
      /^(thanks|thank you|thx) (bye|goodbye|later)$/i,
      /^(gotta go|have to go|i'm done|that'?s all)$/i,
      /^(enough|that'?s enough|i'?m good|all set)$/i,
      /^(see you later|see you soon|talk to you later|ttyl)$/i,
      /^(okay thanks|ok thanks|alright thanks)$/i,
    ]
  },

  /**
   * أنماط طلب معلومات عن منتج معين
   * Product information request patterns
   */
  productInfo: {
    patterns: [
      // عربي
      /(معلومات|تفاصيل|بيانات|وصف) (عن|حول|ل|لـ) .+/i,
      /(شو|ايش|وش) (مواصفات|تفاصيل|معلومات|خصائص) .+[\?؟]/i,
      /(عايز|بدي|أريد|ابغى) (أعرف|اعرف|معلومات عن|تفاصيل عن) .+/i,
      /(قول|قولي|خبر|خبرني|عرف|عرفني) (عن|حول) .+/i,
      /(كيف|شلون) .+ (هذا|هذي|ذا|دي)[\?؟]/i,
      
      // إنجليزي
      /(information|details|info) (about|on|for) .+/i,
      /(what|which) (are|is) the (features|specs|details) of .+[\?]?/i,
      /(tell|show) me (about|more about) .+/i,
      /i want to know (about|more about) .+/i,
      /how (is|are) (the|this|that) .+[\?]?/i,
    ]
  },

  /**
   * أنماط المقارنة
   * Comparison patterns
   */
  comparison: {
    patterns: [
      // عربي
      /(قارن|قارني|ما الفرق|وش الفرق|ايش الفرق) (بين|ما بين)/i,
      /(أيهما|ايهما|مين|منو|وين) (أفضل|افضل|احسن|أحسن|اجود)/i,
      /(ايش|شو|وش) (الفرق|الفروق|الاختلاف|الاختلافات)/i,
      /مقارنة (بين|ما بين)/i,
      /(هذا|هذي|ذا) (ولا|أو|او) (ذاك|ذيك|هذاك)/i,
      
      // إنجليزي
      /compare .+ (with|and|to|vs|versus)/i,
      /(what|which) (is|are) the difference(s)? between/i,
      /(which|what) (is|are) better/i,
      /.+ (or|vs|versus) .+[\?]?/i,
      /comparison (between|of)/i,
    ]
  },

  /**
   * أنماط الاستفسار عن التوفر
   * Availability inquiry patterns
   */
  availability: {
    patterns: [
      // عربي
      /(موجود|متوفر|متاح|فيه|في عندك) .+[\?؟]/i,
      /(عندك|عندكم|لديك|لديكم) .+[\?؟]/i,
      /(تقدر|تقدرون|ممكن) (توفر|توفرون|تجيب|تجيبون) .+[\?؟]/i,
      /وين (القى|الاقي|أجد|اجد|اشتري|أشتري) .+[\?؟]/i,
      /(يوصل|يجي|يصل|متوفر) (لـ|ل|في|عند) .+[\?؟]/i,
      
      // إنجليزي
      /(is|are) .+ (available|in stock)[\?]?/i,
      /(do|does) .+ (have|stock|carry) .+[\?]?/i,
      /can (i|you) (get|find|buy) .+[\?]?/i,
      /where (can|could) i (find|get|buy) .+[\?]?/i,
      /(available|shipping|deliver) (in|to|at) .+[\?]?/i,
    ]
  },

  /**
   * أنماط الشكوى والمشاكل
   * Complaint and problem patterns
   */
  complaint: {
    patterns: [
      // عربي
      /(عندي|في عندي|لدي) (مشكلة|مشكله|خلل|عطل|إشكالية)/i,
      /(مو|مش|ما) (شغال|شغالة|ماشي|ماشية|يعمل|تعمل)/i,
      /(ما|مش|مو) (يفتح|تفتح|يشتغل|تشتغل|يظهر|تظهر)/i,
      /(خربان|خربانة|معطل|معطلة|مكسور|مكسورة)/i,
      /(شكوى|اشتكي|استياء|اعتراض|احتجاج)/i,
      
      // إنجليزي
      /i have (a problem|an issue|trouble|difficulty) (with)?/i,
      /(not|doesn'?t|isn'?t|aren'?t) (work|working|function|functioning)/i,
      /(broken|damaged|defective|faulty)/i,
      /(complaint|complain|issue|problem) (about|with)/i,
      /(can'?t|cannot|unable to) (open|use|access|find)/i,
    ]
  },

  /**
   * أنماط طلب التواصل والدعم
   * Contact and support request patterns
   */
  contact: {
    patterns: [
      // عربي
      /(كيف|وين|فين) (أتواصل|اتواصل|اقدر أتواصل|اتصل|أتصل)/i,
      /(رقم|ايميل|بريد|عنوان) (التواصل|الاتصال|المكتب|الشركة)/i,
      /(أبي|ابغى|أريد|بدي) (أتكلم|اتكلم|أكلم|اكلم) (مع|ويا)/i,
      /(موظف|مسؤول|خدمة العملاء|الدعم الفني|ساپورت)/i,
      /(محتاج|محتاجة|بحاجة لـ) (مساعدة|دعم|مسؤول)/i,
      
      // إنجليزي
      /how (can|do) i (contact|reach|call|email)/i,
      /(contact|phone) (number|info|information|details)/i,
      /i (want|need) to (speak|talk) (with|to)/i,
      /(customer service|support|agent|representative)/i,
      /need (help|assistance|support) from/i,
    ]
  },

  /**
   * كلمات استفهامية (تدل على الحاجة لتوضيح)
   * Question words that indicate clarification needed
   */
  questionWords: {
    ar: [
      'كيف', 'كيفية', 'شلون', 'شلونية',
      'ليش', 'لماذا', 'لما', 'لمذا', 'علام',
      'متى', 'إمتى', 'امتى', 'وقتيش', 'ايمتى',
      'وين', 'أين', 'اين', 'فين', 'منين',
      'شو', 'ايش', 'إيش', 'وش', 'ويش', 'ماذا', 'ما',
      'منو', 'مين', 'من', 'مان',
      'أي', 'اي', 'آي', 'اني', 'أني',
      'كم', 'قد ايش', 'قديش', 'بكم', 'بكام',
      'هل', 'أهل', 'احقا', 'أحقا',
    ],
    en: [
      'how', 'why', 'when', 'where', 'what', 'which', 'who', 'whom',
      'whose', 'how much', 'how many', 'how long', 'how far',
    ],
  },

  /**
   * كلمات دالة على الموقع
   * Location indicators
   */
  locationIndicators: [
    // عربي
    'في', 'من', 'إلى', 'الى', 'عند', 'لدى', 'ب', 'بـ',
    'حول', 'قرب', 'قريب من', 'بجانب', 'جنب', 'بقرب',
    'شمال', 'جنوب', 'شرق', 'غرب', 'وسط',
    'داخل', 'خارج', 'أمام', 'خلف', 'فوق', 'تحت',
    'مدينة', 'حي', 'منطقة', 'شارع', 'حارة', 'زقاق',
    
    // إنجليزي
    'in', 'at', 'on', 'near', 'around', 'by', 'from', 'to',
    'beside', 'next to', 'close to', 'nearby',
    'north', 'south', 'east', 'west', 'center', 'downtown',
    'inside', 'outside', 'front', 'back', 'above', 'below',
    'city', 'area', 'district', 'neighborhood', 'street', 'avenue',
  ],

  /**
   * كلمات دالة على التأكيد
   * Confirmation words
   */
  confirmationWords: {
    positive: [
      // عربي
      'نعم', 'ايوه', 'أيوه', 'إيوه', 'اي', 'آه', 'أه', 'اه',
      'صح', 'صحيح', 'أكيد', 'اكيد', 'طبعا', 'طبعاً', 'أجل', 'اجل',
      'تمام', 'ماشي', 'موافق', 'متفق', 'اوكي', 'اوكيه', 'اوك',
      'زين', 'حلو', 'يب', 'يس', 'ايا', 'اها',
      
      // إنجليزي
      'yes', 'yeah', 'yep', 'yup', 'sure', 'certainly',
      'ok', 'okay', 'alright', 'right', 'correct', 'absolutely',
      'definitely', 'of course', 'indeed', 'affirmative',
    ],
    negative: [
      // عربي
      'لا', 'لأ', 'لاء', 'كلا', 'ابدا', 'أبدا', 'أبداً', 'ابداً',
      'مو', 'مش', 'ما', 'ماني', 'مانى', 'مب',
      'غلط', 'خطأ', 'مو صح', 'مش صح',
      
      // إنجليزي
      'no', 'nope', 'nah', 'nay', 'never', 'not', 'negative',
      'incorrect', 'wrong', 'i don\'t', 'don\'t', 'cannot',
    ],
  },

  /**
   * كلمات دالة على الإلحاح والأولوية
   * Urgency and priority indicators
   */
  urgencyIndicators: [
    // عربي
    'سريع', 'بسرعة', 'عاجل', 'مستعجل', 'ضروري', 'مهم', 'ملح',
    'حالا', 'حالاً', 'فورا', 'فوراً', 'الحين', 'الآن', 'توا',
    'اليوم', 'اليومين', 'بأسرع وقت', 'اسرع شي',
    
    // إنجليزي
    'urgent', 'emergency', 'asap', 'immediately', 'quick', 'quickly',
    'fast', 'now', 'right now', 'important', 'priority', 'today',
  ],

  /**
   * كلمات دالة على عدم التأكد
   * Uncertainty indicators
   */
  uncertaintyIndicators: [
    // عربي
    'ممكن', 'يمكن', 'ربما', 'لعل', 'قد', 'يحتمل',
    'مو متأكد', 'مش متأكد', 'مو واثق', 'مش واثق',
    'تقريبا', 'تقريباً', 'حوالي', 'على ما أظن', 'أعتقد',
    
    // إنجليزي
    'maybe', 'perhaps', 'probably', 'possibly', 'might',
    'not sure', 'uncertain', 'unsure', 'i think', 'i guess',
    'approximately', 'around', 'about',
  ],

  /**
   * كلمات دالة على الكمية
   * Quantity indicators
   */
  quantityIndicators: [
    // عربي - أرقام
    'واحد', 'اثنين', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة',
    'عشرين', 'ثلاثين', 'أربعين', 'خمسين', 'مية', 'مئة', 'ألف', 'الف',
    
    // عربي - كمية
    'كل', 'جميع', 'بعض', 'قليل', 'كثير', 'عدة', 'كمية',
    'شوية', 'شويه', 'كلش', 'وايد', 'مرة', 'حبة', 'قطعة',
    'دزينة', 'زوج', 'حفنة', 'مجموعة',
    
    // إنجليزي
    'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
    'dozen', 'couple', 'few', 'several', 'many', 'much', 'all', 'some',
    'piece', 'pair', 'set', 'group', 'bunch',
  ],

  /**
   * أنماط التفضيلات الشخصية
   * Personal preference patterns
   */
  preferences: {
    patterns: [
      // عربي
      /(أفضل|افضل|احب|أحب|اعشق|أعشق) .+/i,
      /(ما|مش|مو) (أحب|احب|أفضل|افضل|اعشق|أعشق) .+/i,
      /(أريد|بدي|ابغى|عايز) (شي|شيء) (مثل|زي|شبه) .+/i,
      /(يعجبني|يروق لي|يناسبني) .+/i,
      /(على ذوقي|ذوقي|على كيفي|كيفي)/i,
      
      // إنجليزي
      /i (prefer|like|love|enjoy) .+/i,
      /i (don'?t|do not) (prefer|like|love|enjoy) .+/i,
      /i want something (like|similar to) .+/i,
      /(my taste|my style|my preference)/i,
    ]
  },

  /**
   * علامات الترقيم والرموز المهمة
   * Important punctuation and symbols
   */
  punctuationIndicators: {
    question: ['؟', '?', '⁇', '❓'],
    exclamation: ['!', '！', '❗', '⁉'],
    emphasis: ['*', '**', '_', '__', '~', '~~'],
  },

  /**
   * اختصارات شائعة
   * Common abbreviations
   */
  commonAbbreviations: {
    ar: {
      'ان شاء الله': ['ان شاء الله', 'انشاء الله', 'انشالله', 'إن شاء الله'],
      'ماشاء الله': ['ماشاء الله', 'ما شاء الله', 'مشاء الله'],
      'الحمد لله': ['الحمد لله', 'الحمدلله', 'حمدلله'],
      'بإذن الله': ['بإذن الله', 'باذن الله', 'بأذن الله'],
    },
    en: {
      'asap': ['as soon as possible', 'asap', 'a.s.a.p'],
      'fyi': ['for your information', 'fyi', 'f.y.i'],
      'btw': ['by the way', 'btw', 'b.t.w'],
      'lol': ['laugh out loud', 'lol', 'lmao'],
    }
  },
};