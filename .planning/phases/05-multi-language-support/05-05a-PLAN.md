---
phase: 05-multi-language-support
plan: 05a
type: execute
wave: 3
depends_on: [05-01, 05-02, 05-03, 05-04]
files_modified:
  - package.json
  - server/services/translation.js
  - server/database/schema.js
  - server/routes/taskConfirmation.js
  - .env.example
autonomous: false
user_setup:
  - service: google-gemini-api
    why: "Automatic translation of employee notes using Google Gemini API (FREE tier - 15 req/min, 1500 req/day)"
    env_vars:
      - name: GEMINI_API_KEY
        source: "https://aistudio.google.com/apikey -> Create API Key"
    dashboard_config:
      - task: "Get Gemini API Key"
        location: "aistudio.google.com/apikey -> Create API Key"
        notes: "Free tier: 15 requests/minute, 1,500 requests/day"
  - service: google-cloud-translate
    why: "Fallback translation service when Gemini quota exceeded (PAID - $20 per 1M characters)"
    env_vars:
      - name: GOOGLE_APPLICATION_CREDENTIALS
        source: "Google Cloud Console -> IAM & Admin -> Service Accounts -> Create Key (JSON)"
    dashboard_config:
      - task: "Create Google Cloud project"
        location: "console.cloud.google.com -> Create Project"
      - task: "Enable Cloud Translation API"
        location: "console.cloud.google.com -> APIs & Services -> Library -> Cloud Translation API -> Enable"
      - task: "Create service account"
        location: "IAM & Admin -> Service Accounts -> Create Service Account -> Grant 'Cloud Translation API User' role"
      - task: "Download JSON key file"
        location: "Service Accounts -> Your Service Account -> Keys -> Add Key -> Create New Key -> JSON"
    notes: "Optional - only needed when Gemini free tier is exhausted"

must_haves:
  truths:
    - "Employee notes written in their language automatically translated to Hebrew for manager"
    - "If translation fails, manager sees original note with error indicator"
  artifacts:
    - path: "server/services/translation.js"
      provides: "Hybrid translation service (Gemini API primary, Google Translate fallback)"
      exports: ["translateToHebrew", "detectLanguage", "getProviderStats"]
    - path: "server/database/schema.js"
      provides: "tasks.original_language column for storing source language"
      contains: "ALTER TABLE tasks ADD COLUMN original_language"
    - path: "server/routes/taskConfirmation.js"
      provides: "Translate completion_note when employee submits"
      contains: "translateToHebrew"
  key_links:
    - from: "server/routes/taskConfirmation.js"
      to: "server/services/translation.js"
      via: "translateToHebrew call when saving note"
      pattern: "translateToHebrew\\(note"
---

<objective>
Set up hybrid translation service and integrate with task completion endpoint.

Purpose: Enable automatic translation of employee notes from their language to Hebrew using a cost-optimized hybrid approach. Primary translation via FREE Google Gemini API (15 req/min, 1500 req/day), with automatic fallback to Google Cloud Translation API when quota exceeded. When an employee writes a note in English, Russian, or Arabic, the server translates it before storing, ensuring managers can read all notes in Hebrew. Translation happens server-side when note is submitted to minimize API costs.

Strategy: Start with free Gemini API, optionally add paid Google Translate when scaling up.

Output: Hybrid translation service configured, database stores original language + translation provider, task completion endpoint translates non-Hebrew notes with automatic provider selection.
</objective>

<execution_context>
@c:\dev\projects\claude projects\eden claude\.claude\get-shit-done\workflows\execute-plan.md
@c:\dev\projects\claude projects\eden claude\.claude\get-shit-done\templates\summary.md
</execution_context>

<context>
@c:\dev\projects\claude projects\eden claude\.planning\PROJECT.md
@c:\dev\projects\claude projects\eden claude\.planning\ROADMAP.md
@c:\dev\projects\claude projects\eden claude\.planning\STATE.md
@c:\dev\projects\claude projects\eden claude\.planning\phases\05-multi-language-support\05-RESEARCH.md

# Dependencies
@c:\dev\projects\claude projects\eden claude\.planning\phases\05-multi-language-support\05-01-PLAN.md
@c:\dev\projects\claude projects\eden claude\.planning\phases\05-multi-language-support\05-02-PLAN.md
@c:\dev\projects\claude projects\eden claude\.planning\phases\05-multi-language-support\05-03-PLAN.md
@c:\dev\projects\claude projects\eden claude\.planning\phases\05-multi-language-support\05-04-PLAN.md

# Current implementation
@c:\dev\projects\claude projects\eden claude\server\routes\taskConfirmation.js
</context>

<tasks>

<task type="auto">
  <name>Install translation API clients (Gemini + Google Translate)</name>
  <files>package.json, .env.example</files>
  <action>
Install both Gemini API (primary, free) and Google Cloud Translation API (fallback, paid) clients.

Commands:
```bash
cd "c:\dev\projects\claude projects\eden claude"
npm install @google/generative-ai --save
npm install @google-cloud/translate --save
```

Package details:
- **@google/generative-ai**: Google Gemini API client for free translation (15 req/min, 1500 req/day)
- **@google-cloud/translate**: Google Cloud Translation API v2 for fallback when quota exceeded ($20/1M chars)

Do NOT install @vitalets/google-translate-api (unofficial, rate-limited, not production-ready per RESEARCH.md).

Create .env.example file with required environment variables:
```bash
# Google Gemini API (FREE tier - primary translation provider)
# Get key from: https://aistudio.google.com/apikey
GEMINI_API_KEY=your_gemini_api_key_here

# Google Cloud Translation API (PAID fallback - optional)
# Get credentials from: console.cloud.google.com
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account-key.json
```
  </action>
  <verify>
```bash
npm list @google/generative-ai @google-cloud/translate
```
Should show both packages in dependencies.

Verify .env.example exists with both GEMINI_API_KEY and GOOGLE_APPLICATION_CREDENTIALS documented.
  </verify>
  <done>package.json contains @google/generative-ai and @google-cloud/translate in dependencies. .env.example documents required environment variables.</done>
</task>

<task type="auto">
  <name>Create hybrid translation service wrapper</name>
  <files>server/services/translation.js</files>
  <action>
Create hybrid translation service that tries Google Gemini API first (FREE), then falls back to Google Cloud Translation API (PAID) if quota exceeded or credentials missing.

File: `server/services/translation.js`

**Hybrid Strategy:**
1. **Primary:** Google Gemini API (gemini-1.5-flash) - FREE (15 req/min, 1500 req/day)
2. **Fallback:** Google Cloud Translation API - PAID ($20/1M chars) - only when Gemini quota exceeded
3. **Final fallback:** Return original text if both unavailable

```javascript
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
   * Translate text to Hebrew using Gemini API
   * @private
   */
  async _translateWithGemini(text, sourceLanguage) {
    if (!this.geminiModel) {
      return null;
    }

    try {
      const prompt = `Translate the following ${sourceLanguage} text to Hebrew. Return ONLY the Hebrew translation, no explanations or additional text:\n\n${text}`;

      const result = await this.geminiModel.generateContent(prompt);
      const response = await result.response;
      const translation = response.text().trim();

      this.stats.gemini.success++;
      console.log(`✓ Gemini (${sourceLanguage}→he): "${text.substring(0, 40)}..." → "${translation.substring(0, 40)}..."`);
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
   * Translate text to Hebrew using Google Cloud Translation API
   * @private
   */
  async _translateWithGoogleTranslate(text, sourceLanguage) {
    if (!this.googleTranslate) {
      return null;
    }

    try {
      const [translation] = await this.googleTranslate.translate(text, {
        from: sourceLanguage,
        to: 'he'
      });

      this.stats.googleTranslate.success++;
      console.log(`✓ Google Translate (${sourceLanguage}→he): "${text.substring(0, 40)}..." → "${translation.substring(0, 40)}..."`);
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
    if (!text || !text.trim()) {
      return { translation: '', provider: 'none' };
    }

    if (sourceLanguage === 'he') {
      return { translation: text, provider: 'none' }; // Already Hebrew
    }

    // Try Gemini API first (FREE)
    let result = await this._translateWithGemini(text, sourceLanguage);
    if (result) {
      return result;
    }

    // Fallback to Google Cloud Translation API (PAID)
    result = await this._translateWithGoogleTranslate(text, sourceLanguage);
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
```

Key features:
- **Hybrid approach:** Tries FREE Gemini API first, falls back to PAID Google Translate
- **Cost optimization:** Only pays for translation when free quota exhausted
- **Graceful degradation:** Works with 0, 1, or 2 providers configured
- **Provider tracking:** Stats show which provider is being used most
- **Quota detection:** Automatically switches provider when quota exceeded
- **Clear logging:** Shows which provider translated each message
- **Singleton pattern:** One instance shared across app
  </action>
  <verify>
Test hybrid translation service (requires at least GEMINI_API_KEY set):

```bash
node -e "
const translation = require('./server/services/translation.js');

async function test() {
  console.log('Testing Hybrid Translation Service\\n');

  // Test English to Hebrew
  const result1 = await translation.translateToHebrew('Water leak found in bathroom', 'en');
  console.log('EN→HE:', result1);

  // Test Russian to Hebrew
  const result2 = await translation.translateToHebrew('Обнаружена утечка воды в ванной', 'ru');
  console.log('RU→HE:', result2);

  // Test Arabic to Hebrew
  const result3 = await translation.translateToHebrew('تم العثور على تسرب في الحمام', 'ar');
  console.log('AR→HE:', result3);

  // Test Hebrew (should return as-is, no translation)
  const result4 = await translation.translateToHebrew('נמצאה דליפת מים', 'he');
  console.log('HE→HE:', result4);

  // Get provider statistics
  console.log('\\nProvider Stats:', translation.getProviderStats());
}

test().catch(console.error);
"
```

Expected output (if GEMINI_API_KEY configured):
- EN→HE: { translation: 'נמצאה דליפת מים בחדר האמבטיה', provider: 'gemini' }
- RU→HE: { translation: 'נמצאה דליפת מים באמבטיה', provider: 'gemini' }
- AR→HE: { translation: 'נמצאה נזילה בחדר האמבטיה', provider: 'gemini' }
- HE→HE: { translation: 'נמצאה דליפת מים', provider: 'none' }
- Provider Stats: Shows gemini.success: 3, googleTranslate.success: 0

If only GOOGLE_APPLICATION_CREDENTIALS configured:
- All translations use provider: 'google-translate'

If no credentials configured:
- Logs warnings, returns original text with provider: 'none'
  </verify>
  <done>server/services/translation.js exists, exports translateToHebrew and getProviderStats functions, implements hybrid provider strategy (Gemini → Google Translate → original text), handles missing credentials gracefully, logs all translation operations with provider info.</done>
</task>

<task type="auto">
  <name>Add translation tracking columns to tasks table</name>
  <files>server/database/schema.js</files>
  <action>
Add columns to store the original language and translation provider used for completion notes.

In `server/database/schema.js`, add migrations after other task column migrations:

```javascript
// Add original_language column if it doesn't exist (migration for Phase 5 note translation)
try {
  db.exec(`ALTER TABLE tasks ADD COLUMN original_language TEXT CHECK(original_language IN ('he', 'en', 'ru', 'ar'))`);
  console.log('✓ Added original_language column to tasks table');
} catch (e) {
  // Column already exists, ignore error
  if (!e.message.includes('duplicate column name')) {
    console.error('Error adding original_language column:', e.message);
  }
}

// Add translation_provider column to track which API was used (migration for Phase 5)
try {
  db.exec(`ALTER TABLE tasks ADD COLUMN translation_provider TEXT CHECK(translation_provider IN ('gemini', 'google-translate', 'none'))`);
  console.log('✓ Added translation_provider column to tasks table');
} catch (e) {
  // Column already exists, ignore error
  if (!e.message.includes('duplicate column name')) {
    console.error('Error adding translation_provider column:', e.message);
  }
}
```

**Column purposes:**

`original_language` - stores the language the employee wrote their note in:
- NULL: No note, or note in Hebrew (default/no translation needed)
- 'en': Note was in English, completion_note contains Hebrew translation
- 'ru': Note was in Russian, completion_note contains Hebrew translation
- 'ar': Note was in Arabic, completion_note contains Hebrew translation

`translation_provider` - tracks which API was used for translation (for cost monitoring):
- NULL: No translation needed (Hebrew note or no note)
- 'gemini': Translated using FREE Gemini API
- 'google-translate': Translated using PAID Google Cloud Translation API (fallback)
- 'none': Translation failed or not configured, shows original text

Manager UI uses these to show translation indicator ("🇬🇧 מתורגם מאנגלית via Gemini API").
  </action>
  <verify>
Restart server to run migrations, then check schema:
```bash
node -e "
const { db } = require('./server/database/schema.js');
const result = db.prepare('PRAGMA table_info(tasks)').all();
const originalLangCol = result.find(c => c.name === 'original_language');
const providerCol = result.find(c => c.name === 'translation_provider');
console.log('original_language column:', originalLangCol);
console.log('translation_provider column:', providerCol);
"
```
Should output both columns with type TEXT and CHECK constraints.
  </verify>
  <done>tasks table has original_language and translation_provider columns with CHECK constraints, NULL allowed for no translation.</done>
</task>

<task type="auto">
  <name>Translate notes in task completion endpoint</name>
  <files>server/routes/taskConfirmation.js</files>
  <action>
Update POST /:token/complete endpoint to translate employee notes to Hebrew.

**At top of file, add translation service import:**
```javascript
const translation = require('../services/translation');
```

**In the completion endpoint (around line 143-184), modify note handling:**

Current code:
```javascript
// Save note if provided
if (note && note.trim()) {
  db.prepare(`
    UPDATE tasks SET completion_note = ? WHERE id = ?
  `).run(note.trim(), taskId);
}
```

Replace with:
```javascript
// Save note if provided, translate to Hebrew if needed
if (note && note.trim()) {
  // Get employee language to determine if translation needed
  const task = db.prepare('SELECT employee_id FROM tasks WHERE id = ?').get(taskId);
  const employee = db.prepare('SELECT language FROM employees WHERE id = ?').get(task.employee_id);
  const employeeLanguage = employee?.language || 'he';

  let translatedNote = note.trim();
  let originalLanguage = null;
  let translationProvider = null;

  if (employeeLanguage !== 'he') {
    // Employee's language is not Hebrew, translate note
    console.log(`Translating note from ${employeeLanguage} to Hebrew...`);
    const result = await translation.translateToHebrew(note.trim(), employeeLanguage);
    translatedNote = result.translation;
    translationProvider = result.provider;
    originalLanguage = employeeLanguage;

    console.log(`Translation completed: ${translationProvider} (${employeeLanguage}→he)`);
  }

  // Save translated note, original language, and translation provider
  db.prepare(`
    UPDATE tasks SET completion_note = ?, original_language = ?, translation_provider = ? WHERE id = ?
  `).run(translatedNote, originalLanguage, translationProvider, taskId);

  console.log(`Note saved (language: ${originalLanguage || 'he'}, provider: ${translationProvider || 'none'})`);
}
```

Make the route handler async:
```javascript
router.post('/:token/complete', upload.single('image'), async (req, res) => {
  // ... existing code
```

Error handling: The translation service already handles errors gracefully (returns original text with "[שגיאת תרגום]" prefix), so no additional try-catch needed here.
  </action>
  <verify>
Test note translation via employee task completion:

1. **Create English employee:**
   ```bash
   curl -X POST http://localhost:3002/api/employees \
     -H "Content-Type: application/json" \
     -d '{"name":"English Test","phone":"0501234567","language":"en"}'
   ```

2. **Assign task, send via WhatsApp, get token from URL**

3. **Complete task with English note:**
   ```bash
   curl -X POST http://localhost:3002/api/confirm/{TOKEN}/complete \
     -F "taskId=123" \
     -F "note=Water leak found in the bathroom"
   ```

4. **Check database:**
   ```bash
   node -e "
   const { db } = require('./server/database/schema.js');
   const task = db.prepare('SELECT completion_note, original_language, translation_provider FROM tasks WHERE id = 123').get();
   console.log('Note:', task.completion_note);
   console.log('Original language:', task.original_language);
   console.log('Translation provider:', task.translation_provider);
   "
   ```
   Should show Hebrew translation of "Water leak found in the bathroom", original_language = 'en', and translation_provider = 'gemini' (or 'google-translate' if Gemini quota exceeded).

5. **Test Hebrew employee (no translation):**
   - Create Hebrew employee, complete task with Hebrew note
   - Verify completion_note stays in Hebrew, original_language is NULL, translation_provider is NULL

6. **Check server logs:**
   Should see: "Translating note from en to Hebrew...", "Translation completed: gemini (en→he)", and "Note saved (language: en, provider: gemini)"
  </verify>
  <done>Task completion endpoint translates non-Hebrew notes to Hebrew using hybrid translation service, stores translated text in completion_note, stores source language in original_language column, stores translation provider (gemini/google-translate/none) in translation_provider column.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
Hybrid translation service integrated with task completion flow. Employee notes in English, Russian, or Arabic are automatically translated to Hebrew using FREE Gemini API (with fallback to PAID Google Translate), and stored with original language + provider tracking.
  </what-built>
  <how-to-verify>
**Prerequisites:**
1. Set GEMINI_API_KEY environment variable (get from https://aistudio.google.com/apikey)
2. Optionally set GOOGLE_APPLICATION_CREDENTIALS for fallback (only needed when Gemini quota exceeded)
3. Restart server to load credentials

**Test steps:**

1. **English employee:**
   - Create employee with language='en' via manager UI
   - Assign task to employee
   - Send via WhatsApp
   - Open interactive page (you can do this from desktop browser by visiting the generated URL)
   - Write note in English: "Fixed the leak, replaced pipe section"
   - Click "Submit Completion"
   - Go to manager UI, view task
   - **Verify:** Note shows Hebrew translation

2. **Russian employee:**
   - Create employee with language='ru'
   - Assign task, send via WhatsApp
   - Open interactive page
   - Write note in Russian: "Проблема решена"
   - Submit
   - **Verify:** Manager sees Hebrew translation

3. **Hebrew employee (no translation):**
   - Create employee with language='he'
   - Assign task, send via WhatsApp
   - Write note in Hebrew: "תוקן בהצלחה"
   - Submit
   - **Verify:** Manager sees original Hebrew note

4. **Check translation quality:**
   - Does translated text make sense in Hebrew?
   - Are technical terms preserved correctly?
   - Are there any "[שגיאת תרגום]" prefixes (indicates translation failure)?

5. **Server logs:**
   - Check console for "Translating note from en to Hebrew..." messages
   - Check for any translation errors

**Expected results:**
- English/Russian/Arabic notes translated to Hebrew
- Original language stored (en/ru/ar)
- Translation provider stored (gemini/google-translate/none)
- Hebrew notes unchanged (original_language and translation_provider both NULL)
- Server logs show which provider was used for each translation
- No errors in server logs

**Cost verification:**
- Check that Gemini API is being used (provider: 'gemini' in database)
- Verify you're staying within free tier (15 req/min, 1500 req/day)
- Google Translate should only be used if Gemini quota exceeded
  </how-to-verify>
  <resume-signal>
Type "approved" if translation works correctly, or describe any issues found (translation quality, errors, etc.)
  </resume-signal>
</task>

</tasks>

<verification>
Hybrid translation service setup verification:

1. **Environment setup:**
   - GEMINI_API_KEY environment variable set (PRIMARY - FREE)
   - Optionally GOOGLE_APPLICATION_CREDENTIALS set (FALLBACK - PAID)
   - Translation API enabled in Google Cloud Console (only if using fallback)
   - Service account has "Cloud Translation API User" role (only if using fallback)

2. **Package installation:**
   ```bash
   npm list @google/generative-ai @google-cloud/translate
   ```
   Both packages should be installed.

3. **Translation service functional:**
   ```bash
   node -e "
   const translation = require('./server/services/translation.js');
   translation.translateToHebrew('Test message', 'en').then(result => {
     console.log('Translation result:', result);
     console.log('Provider stats:', translation.getProviderStats());
   });
   "
   ```
   Should show translation + provider used.

4. **Database schema:**
   ```bash
   node -e "
   const { db } = require('./server/database/schema.js');
   const info = db.prepare('PRAGMA table_info(tasks)').all();
   console.log('original_language:', info.find(col => col.name === 'original_language'));
   console.log('translation_provider:', info.find(col => col.name === 'translation_provider'));
   "
   ```
   Both columns should exist with CHECK constraints.

5. **Task completion endpoint:**
   - Endpoint is async
   - Imports translation service
   - Queries employee language
   - Calls translateToHebrew for non-Hebrew employees
   - Stores original_language AND translation_provider in database
   - Logs provider used for each translation

6. **Provider selection:**
   - Gemini API used by default (FREE)
   - Google Translate only used when Gemini quota exceeded (PAID)
   - Provider stats tracked for cost monitoring

7. **Checkpoint approved:**
   - User has tested translation with multiple languages
   - Translation quality acceptable
   - Provider usage verified (Gemini being used)
   - No errors in production
</verification>

<success_criteria>
1. @google/generative-ai and @google-cloud/translate installed in package.json
2. .env.example documents GEMINI_API_KEY and GOOGLE_APPLICATION_CREDENTIALS
3. server/services/translation.js exists, exports translateToHebrew and getProviderStats
4. Translation service implements hybrid provider strategy (Gemini → Google Translate → original text)
5. Translation service handles missing credentials gracefully
6. tasks.original_language column exists with CHECK constraint (he, en, ru, ar)
7. tasks.translation_provider column exists with CHECK constraint (gemini, google-translate, none)
8. Task completion endpoint is async
9. Task completion endpoint translates non-Hebrew notes using hybrid service
10. Translated note stored in completion_note, source language in original_language, provider in translation_provider
11. Hebrew notes not translated, original_language and translation_provider both stay NULL
12. Translation errors logged but don't crash server
13. Server logs show provider used for each translation
14. Provider stats available via getProviderStats() for cost monitoring
15. Checkpoint approved: translation quality acceptable, Gemini API being used (FREE tier)
</success_criteria>

<output>
After completion, create `.planning/phases/05-multi-language-support/05-05a-SUMMARY.md`

Document:
- **Hybrid translation architecture:** Gemini API (FREE) → Google Translate (PAID fallback) → Original text
- **Cost optimization strategy:** Start free, pay only when scaling up
- **Database schema additions:**
  - `original_language` column (he/en/ru/ar) - tracks source language
  - `translation_provider` column (gemini/google-translate/none) - tracks which API used for cost monitoring
- **Translation flow:** employee submits → detect language → try Gemini → fallback to Google Translate → store with provider
- **User setup completed:** GEMINI_API_KEY configured (GOOGLE_APPLICATION_CREDENTIALS optional)
- **Fallback behavior:** Graceful degradation through 3 levels (Gemini → Google Translate → original text)
- **Cost implications:**
  - FREE tier: 15 req/min, 1500 req/day via Gemini
  - PAID tier: $20/1M characters via Google Translate (only when Gemini exhausted)
- **Provider tracking:** getProviderStats() shows usage breakdown for cost monitoring
- **Next steps:** Add UI indicators in manager interface showing translation provider (Plan 05b)
</output>
