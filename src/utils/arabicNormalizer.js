/**
 * Arabic Text Normalizer
 * Handles variations in Arabic spelling for better search matching
 */

class ArabicNormalizer {
  /**
   * Normalize Arabic text for comparison
   */
  static normalize(text) {
    if (!text) return '';
    
    return text
      .toString()
      .toLowerCase()
      // Normalize alef variations (أ إ آ ا)
      .replace(/[أإآٱ]/g, 'ا')
      // Normalize ta marbuta to ha (ة → ه)
      .replace(/ة/g, 'ه')
      // Normalize alef maksura to ya (ى → ي)
      .replace(/ى/g, 'ي')
      // Normalize waw with hamza (ؤ → و)
      .replace(/ؤ/g, 'و')
      // Normalize ya with hamza (ئ → ي)
      .replace(/ئ/g, 'ي')
      // Remove tashkeel (diacritics)
      .replace(/[\u064B-\u065F\u0670]/g, '')
      // Remove tatweel (kashida)
      .replace(/\u0640/g, '')
      .trim();
  }
  
  /**
   * Extract Arabic word root (simplified)
   * Removes common prefixes and suffixes
   */
  static extractRoot(word) {
    if (!word || word.length < 3) return word;
    
    let root = this.normalize(word);
    
    // Remove common prefixes
    const prefixes = ['ال', 'وال', 'بال', 'كال', 'فال', 'لل'];
    for (const prefix of prefixes) {
      if (root.startsWith(prefix)) {
        root = root.slice(prefix.length);
        break;
      }
    }
    
    // Remove common suffixes
    const suffixes = ['ات', 'ين', 'ون', 'ان', 'يه', 'يا', 'ها', 'هم'];
    for (const suffix of suffixes) {
      if (root.endsWith(suffix) && root.length > 3) {
        root = root.slice(0, -suffix.length);
        break;
      }
    }
    
    return root;
  }
  
  /**
   * Check if two Arabic words match (considering variations)
   */
  static matches(word1, word2) {
    const n1 = this.normalize(word1);
    const n2 = this.normalize(word2);
    
    // Exact match after normalization
    if (n1 === n2) return true;
    
    // One contains the other
    if (n1.includes(n2) || n2.includes(n1)) return true;
    
    // Root match
    const r1 = this.extractRoot(word1);
    const r2 = this.extractRoot(word2);
    if (r1 === r2 && r1.length >= 2) return true;
    
    return false;
  }
  
  /**
   * Calculate match score between two Arabic strings
   * Returns 0-1 score
   */
  static matchScore(text, query) {
    const normalizedText = this.normalize(text);
    const normalizedQuery = this.normalize(query);
    const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length > 1);
    
    if (queryWords.length === 0) return 0;
    
    let matchedWords = 0;
    for (const word of queryWords) {
      if (normalizedText.includes(word)) {
        matchedWords++;
      } else {
        // Try root matching
        const root = this.extractRoot(word);
        if (root.length >= 2 && normalizedText.includes(root)) {
          matchedWords += 0.5;
        }
      }
    }
    
    return matchedWords / queryWords.length;
  }
}

module.exports = ArabicNormalizer;

