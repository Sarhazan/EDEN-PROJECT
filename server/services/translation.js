const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Translate } = require('@google-cloud/translate').v2;

/**
 * Hybrid Translation Service
 *
 * Strategy:
 * 1. Try Google Gemini API (FREE - 15 req/min, 1500 req/day)
 * 2. Fallback to Google Cloud Translation API (PAID - $20/1M chars)
 * 3. Final fallback: return original text
 *
 * Cost optimization: Start with free tier, only pay when scaling up
 */
class TranslationService {
  constructor() {
    // Initialize Gemini API (FREE - primary provider)
    this.gemini = null;
    this.geminiModel = null;
    if (process.env.GEMINI_API_KEY) {
      try {
        this.gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.geminiModel = this.gemini.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
        console.log('✓ Google Gemini API initialized (FREE tier - primary provider)');
      } catch (error) {
        console.error('✗ Failed to initialize Gemini API:', error.message);
      }
    } else {
      console.warn('⚠️ GEMINI_API_KEY not set - skipping Gemini provider');
    }

    // Initialize Google Cloud Translation API (PAID - fallback provider)
    this.googleTranslate = null;
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      try {
        this.googleTranslate = new Translate();
        console.log('✓ Google Cloud Translation API initialized (PAID fallback)');
      } catch (error) {
        console.error('✗ Failed to initialize Translation API:', error.message);
      }
    } else {
      console.warn('⚠️ GOOGLE_APPLICATION_CREDENTIALS not set - skipping Google Translate fallback');
    }

    // Provider usage statistics
    this.stats = {
      gemini: { success: 0, failed: 0 },
      googleTranslate: { success: 0, failed: 0 },
      noTranslation: 0
    };
  }

  /**
   * Translate text using Gemini API (supports any language pair)
   * @private
   */
  async _translateWithGemini(text, sourceLanguage, targetLanguage) {
    if (!this.geminiModel) {
      return null;
    }

    try {
      const languageNames = {
        he: 'Hebrew',
        en: 'English',
        ru: 'Russian',
        ar: 'Arabic'
      };

      const sourceName = languageNames[sourceLanguage] || sourceLanguage;
      const targetName = languageNames[targetLanguage] || targetLanguage;

      const prompt = `Translate the following ${sourceName} text to ${targetName}. Return ONLY the ${targetName} translation, no explanations or additional text:\n\n${text}`;

      const result = await this.geminiModel.generateContent(prompt);
      const response = await result.response;
      const translation = response.text().trim();

      this.stats.gemini.success++;
      console.log(`✓ Gemini (${sourceLanguage}→${targetLanguage}): "${text.substring(0, 40)}..." → "${translation.substring(0, 40)}..."`);
      return { translation, provider: 'gemini' };
    } catch (error) {
      this.stats.gemini.failed++;

      // Check if quota exceeded (rate limit or daily limit)
      if (error.message?.includes('quota') || error.message?.includes('rate') || error.message?.includes('limit')) {
        console.warn(`⚠️ Gemini quota exceeded: ${error.message} - falling back to Google Translate`);
      } else {
        console.error('✗ Gemini translation error:', error.message);
      }

      return null;
    }
  }

  /**
   * Translate text using Google Cloud Translation API (supports any language pair)
   * @private
   */
  async _translateWithGoogleTranslate(text, sourceLanguage, targetLanguage) {
    if (!this.googleTranslate) {
      return null;
    }

    try {
      const [translation] = await this.googleTranslate.translate(text, {
        from: sourceLanguage,
        to: targetLanguage
      });

      this.stats.googleTranslate.success++;
      console.log(`✓ Google Translate (${sourceLanguage}→${targetLanguage}): "${text.substring(0, 40)}..." → "${translation.substring(0, 40)}..."`);
      return { translation, provider: 'google-translate' };
    } catch (error) {
      this.stats.googleTranslate.failed++;
      console.error('✗ Google Translate error:', error.message);
      return null;
    }
  }

  /**
   * Translate text to Hebrew (hybrid: tries Gemini, then Google Translate, then original text)
   * @param {string} text - Text to translate
   * @param {string} sourceLanguage - Source language code (en, ru, ar)
   * @returns {Promise<{translation: string, provider: string}>} - Translated text + provider used
   */
  async translateToHebrew(text, sourceLanguage) {
    return this.translate(text, sourceLanguage, 'he');
  }

  /**
   * Translate text from Hebrew to target language (hybrid: tries Gemini, then Google Translate, then original text)
   * @param {string} text - Text to translate
   * @param {string} targetLanguage - Target language code (en, ru, ar)
   * @returns {Promise<{translation: string, provider: string}>} - Translated text + provider used
   */
  async translateFromHebrew(text, targetLanguage) {
    return this.translate(text, 'he', targetLanguage);
  }

  /**
   * Translate text between any supported languages (hybrid: tries Gemini, then Google Translate, then original text)
   * @param {string} text - Text to translate
   * @param {string} sourceLanguage - Source language code (he, en, ru, ar)
   * @param {string} targetLanguage - Target language code (he, en, ru, ar)
   * @returns {Promise<{translation: string, provider: string}>} - Translated text + provider used
   */
  async translate(text, sourceLanguage, targetLanguage) {
    if (!text || !text.trim()) {
      return { translation: '', provider: 'none' };
    }

    if (sourceLanguage === targetLanguage) {
      return { translation: text, provider: 'none' }; // Same language, no translation needed
    }

    // Try Gemini API first (FREE)
    let result = await this._translateWithGemini(text, sourceLanguage, targetLanguage);
    if (result) {
      return result;
    }

    // Fallback to Google Cloud Translation API (PAID)
    result = await this._translateWithGoogleTranslate(text, sourceLanguage, targetLanguage);
    if (result) {
      return result;
    }

    // Final fallback: return original text
    this.stats.noTranslation++;
    console.warn('⚠️ All translation providers unavailable, returning original text');
    return { translation: text, provider: 'none' };
  }

  /**
   * Get translation provider usage statistics
   * @returns {Object} - Usage stats for each provider
   */
  getProviderStats() {
    return {
      ...this.stats,
      totalTranslations: this.stats.gemini.success + this.stats.googleTranslate.success,
      geminiAvailable: !!this.geminiModel,
      googleTranslateAvailable: !!this.googleTranslate
    };
  }
}

// Export singleton instance
module.exports = new TranslationService();
