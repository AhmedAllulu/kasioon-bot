/**
 * Language Detection Utility
 * Detects whether text is Arabic or English
 */

/**
 * Detect language from text
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

  // If Arabic characters are present and more than 10% of the text, consider it Arabic
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

/**
 * Check if text is primarily Arabic
 * @param {string} text - Text to analyze
 * @returns {boolean}
 */
function isArabic(text) {
  return detectLanguage(text) === 'ar';
}

/**
 * Check if text is primarily English
 * @param {string} text - Text to analyze
 * @returns {boolean}
 */
function isEnglish(text) {
  return detectLanguage(text) === 'en';
}

module.exports = {
  detectLanguage,
  isArabic,
  isEnglish
};
