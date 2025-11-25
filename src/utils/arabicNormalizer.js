/**
 * Arabic Text Normalizer
 * Handles Arabic text normalization for better search matching
 */

class ArabicNormalizer {
  /**
   * Normalize Arabic text by removing diacritics and standardizing letters
   * @param {string} text - Arabic text to normalize
   * @returns {string} Normalized text
   */
  static normalize(text) {
    if (!text || typeof text !== 'string') {
      return '';
    }

    let normalized = text;

    // Remove Arabic diacritics (tashkeel)
    normalized = normalized.replace(/[\u064B-\u0652]/g, ''); // ً ٌ ٍ َ ُ ِ ّ ْ

    // Normalize alef variations
    normalized = normalized.replace(/[أإآٱ]/g, 'ا'); // أ إ آ ٱ -> ا

    // Normalize ya variations
    normalized = normalized.replace(/ى/g, 'ي'); // ى -> ي

    // Normalize ta marbuta
    normalized = normalized.replace(/ة/g, 'ه'); // ة -> ه

    // Normalize hamza
    normalized = normalized.replace(/ؤ/g, 'و'); // ؤ -> و
    normalized = normalized.replace(/ئ/g, 'ي'); // ئ -> ي

    // Remove tatweel (kashida)
    normalized = normalized.replace(/ـ/g, ''); // ـ

    // Trim and collapse multiple spaces
    normalized = normalized.trim().replace(/\s+/g, ' ');

    return normalized;
  }

  /**
   * Normalize and lowercase text (for case-insensitive matching)
   * @param {string} text - Text to normalize
   * @returns {string} Normalized and lowercased text
   */
  static normalizeAndLower(text) {
    return this.normalize(text).toLowerCase();
  }

  /**
   * Extract keywords from Arabic text
   * @param {string} text - Arabic text
   * @param {number} minLength - Minimum keyword length
   * @returns {string[]} Array of keywords
   */
  static extractKeywords(text, minLength = 2) {
    const normalized = this.normalize(text);
    const words = normalized.split(/\s+/);

    // Remove stop words and short words
    const stopWords = new Set([
      'في', 'من', 'الى', 'على', 'عن', 'مع', 'بدي', 'أريد', 'ابحث',
      'عن', 'لدي', 'اين', 'كيف', 'ماذا', 'متى', 'أين', 'هل', 'ما'
    ]);

    return words
      .filter(word => word.length >= minLength && !stopWords.has(word))
      .map(word => word.toLowerCase());
  }

  /**
   * Check if text contains Arabic characters
   * @param {string} text - Text to check
   * @returns {boolean} True if contains Arabic
   */
  static containsArabic(text) {
    if (!text) return false;
    return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(text);
  }

  /**
   * Detect primary language of text
   * @param {string} text - Text to analyze
   * @returns {string} 'ar' or 'en'
   */
  static detectLanguage(text) {
    if (!text) return 'ar';

    const arabicChars = (text.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g) || []).length;
    const englishChars = (text.match(/[a-zA-Z]/g) || []).length;

    return arabicChars > englishChars ? 'ar' : 'en';
  }

  /**
   * Remove extra spaces and normalize whitespace
   * @param {string} text - Text to clean
   * @returns {string} Cleaned text
   */
  static cleanWhitespace(text) {
    if (!text) return '';
    return text.trim().replace(/\s+/g, ' ');
  }

  /**
   * Normalize Syrian dialect variations to standard Arabic
   * @param {string} text - Text with dialect
   * @returns {string} Normalized text
   */
  static normalizeSyrianDialect(text) {
    let normalized = text;

    const dialectMap = {
      'بدي': 'أريد',
      'هيك': 'كذلك',
      'كتير': 'كثير',
      'شوي': 'قليل',
      'منيح': 'جيد',
      'مو': 'ليس',
      'شو': 'ماذا',
      'وين': 'أين',
      'ليش': 'لماذا'
    };

    Object.entries(dialectMap).forEach(([dialect, standard]) => {
      const regex = new RegExp(`\\b${dialect}\\b`, 'g');
      normalized = normalized.replace(regex, standard);
    });

    return normalized;
  }

  /**
   * Create search-friendly version of text
   * @param {string} text - Original text
   * @returns {string} Search-optimized text
   */
  static toSearchFormat(text) {
    return this.normalizeAndLower(
      this.normalizeSyrianDialect(text)
    );
  }
}

module.exports = ArabicNormalizer;
