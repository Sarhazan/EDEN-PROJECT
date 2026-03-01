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
        this.geminiModel = this.gemini.getGenerativeModel({ model: 'gemini-1.5-flash' });
        console.log('✓ Google Gemini API initialized (FREE tier - primary provider)');
      } catch (error) {
        console.error('✗ Failed to initialize Gemini API:', error.message);
      }
    } else {
      console.warn('⚠️ GEMINI_API_KEY not set - skipping Gemini provider');
    }

    // Initialize Google Cloud Translation API (PAID - fallback provider)
    // Supports both API Key (simpler) and Service Account (GOOGLE_APPLICATION_CREDENTIALS)
    this.googleTranslate = null;
    if (process.env.GOOGLE_TRANSLATE_API_KEY) {
      try {
        // Use API Key authentication (simpler setup)
        this.googleTranslate = new Translate({ key: process.env.GOOGLE_TRANSLATE_API_KEY });
        console.log('✓ Google Cloud Translation API initialized with API Key (PAID fallback)');
      } catch (error) {
        console.error('✗ Failed to initialize Translation API with API Key:', error.message);
      }
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      try {
        // Use Service Account authentication (full GCP setup)
        this.googleTranslate = new Translate();
        console.log('✓ Google Cloud Translation API initialized with Service Account (PAID fallback)');
      } catch (error) {
        console.error('✗ Failed to initialize Translation API:', error.message);
      }
    } else {
      // Try to load from database (deferred - will be loaded on first use)
      this._loadApiKeyFromDatabase();
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
        he: 'Hebrew', en: 'English', ru: 'Russian', ar: 'Arabic',
        hi: 'Hindi', fil: 'Filipino', de: 'German', fr: 'French',
        es: 'Spanish', it: 'Italian', pt: 'Portuguese', nl: 'Dutch',
        pl: 'Polish', uk: 'Ukrainian', tr: 'Turkish', fa: 'Persian',
        ur: 'Urdu', bn: 'Bengali', pa: 'Punjabi', gu: 'Gujarati',
        mr: 'Marathi', ta: 'Tamil', te: 'Telugu', kn: 'Kannada',
        ml: 'Malayalam', th: 'Thai', vi: 'Vietnamese', id: 'Indonesian',
        ms: 'Malay', ko: 'Korean', ja: 'Japanese', 'zh-cn': 'Chinese Simplified',
        'zh-tw': 'Chinese Traditional', am: 'Amharic', sw: 'Swahili',
        ha: 'Hausa', yo: 'Yoruba', zu: 'Zulu', so: 'Somali',
        ne: 'Nepali', si: 'Sinhala', my: 'Burmese', km: 'Khmer',
        lo: 'Lao', mn: 'Mongolian', ka: 'Georgian', hy: 'Armenian',
        az: 'Azerbaijani', kk: 'Kazakh', uz: 'Uzbek', tg: 'Tajik',
        ro: 'Romanian', hu: 'Hungarian', cs: 'Czech', sk: 'Slovak',
        bg: 'Bulgarian', hr: 'Croatian', sr: 'Serbian', sl: 'Slovenian',
        el: 'Greek', lt: 'Lithuanian', lv: 'Latvian', et: 'Estonian',
        fi: 'Finnish', sv: 'Swedish', no: 'Norwegian', da: 'Danish',
        is: 'Icelandic'
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

  /**
   * Update Google Translate API Key at runtime
   * @param {string} apiKey - New API key
   * @returns {boolean} - Whether initialization succeeded
   */
  setGoogleTranslateApiKey(apiKey) {
    if (!apiKey || !apiKey.trim()) {
      this.googleTranslate = null;
      console.log('✓ Google Translate API disabled');
      return true;
    }

    try {
      this.googleTranslate = new Translate({ key: apiKey.trim() });
      console.log('✓ Google Translate API Key updated');
      return true;
    } catch (error) {
      console.error('✗ Failed to set Google Translate API Key:', error.message);
      return false;
    }
  }

  /**
   * Test Gemini API connection
   * @returns {Promise<{success: boolean, translation?: string, error?: string}>}
   */
  async testGemini() {
    if (!this.geminiModel) {
      return { success: false, error: 'Gemini not configured (GEMINI_API_KEY not set)' };
    }
    try {
      const prompt = `Translate the following Hebrew text to English. Return ONLY the English translation, no explanations:\n\nשלום`;
      const result = await this.geminiModel.generateContent(prompt);
      const response = await result.response;
      const translation = response.text().trim();
      this.stats.gemini.success++;
      return { success: true, translation, model: 'gemini-1.5-flash' };
    } catch (error) {
      this.stats.gemini.failed++;
      return { success: false, error: error.message, stack: error.stack?.split('\n')[0] };
    }
  }

  /**
   * Test Google Translate API connection
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async testGoogleTranslate() {
    if (!this.googleTranslate) {
      return { success: false, error: 'Google Translate not configured' };
    }

    try {
      // Simple test translation
      const [translation] = await this.googleTranslate.translate('Hello', { to: 'he' });
      return { success: true, testResult: translation };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Load API key from database (for persistence across restarts)
   * @private
   */
  _loadApiKeyFromDatabase() {
    try {
      // Defer database import to avoid circular dependency at startup
      setTimeout(() => {
        try {
          const { db } = require('../database/schema');
          const setting = db.prepare(`SELECT value FROM settings WHERE key = 'google_translate_api_key'`).get();
          if (setting && setting.value) {
            this.googleTranslate = new Translate({ key: setting.value });
            console.log('✓ Google Translate API Key loaded from database');
          } else {
            console.warn('⚠️ No Google Translate API key configured - skipping Google Translate fallback');
          }
        } catch (dbError) {
          // Database might not be initialized yet, or table doesn't exist
          console.warn('⚠️ Could not load Google Translate API key from database:', dbError.message);
        }
      }, 1000); // Small delay to ensure database is ready
    } catch (error) {
      console.warn('⚠️ Error loading API key from database:', error.message);
    }
  }
}

// Export singleton instance
module.exports = new TranslationService();
