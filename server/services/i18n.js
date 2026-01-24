const i18next = require('i18next');
const Backend = require('i18next-fs-backend');
const path = require('path');

// Initialize i18next for server-side translations
i18next
  .use(Backend)
  .init({
    lng: 'he',              // Default language
    fallbackLng: 'he',      // Fallback if translation missing
    supportedLngs: ['he', 'en', 'ru', 'ar'],
    ns: ['common', 'tasks', 'whatsapp'],  // Namespaces
    defaultNS: 'common',
    backend: {
      loadPath: path.join(__dirname, '../../src/locales/{{lng}}/{{ns}}.json')
    },
    interpolation: {
      escapeValue: false    // Not needed for server-side (no XSS risk)
    },
    saveMissing: false,      // Don't auto-create missing keys in production
    preload: ['he', 'en', 'ru', 'ar'],  // Preload all languages at startup
    initImmediate: false     // Initialize synchronously (blocks until all preloaded languages are loaded)
  });

// Export translation functions
module.exports = {
  // Translate a key with optional options (interpolation values, context, etc.)
  t: (key, options) => i18next.t(key, options),

  // Change the global language (use with caution in multi-user environment)
  changeLanguage: (lng) => i18next.changeLanguage(lng),

  // Get a fixed translator for a specific language (thread-safe for concurrent requests)
  // This is the recommended approach for server-side translations to avoid race conditions
  getFixedT: (lng, ns) => i18next.getFixedT(lng, ns)
};
