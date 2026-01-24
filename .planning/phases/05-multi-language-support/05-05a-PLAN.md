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
autonomous: false
user_setup:
  - service: google-cloud-translate
    why: "Automatic translation of employee notes from their language to Hebrew for manager"
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

must_haves:
  truths:
    - "Employee notes written in their language automatically translated to Hebrew for manager"
    - "Translation happens when note is saved (not on every view)"
    - "If translation fails, manager sees original note with error indicator"
  artifacts:
    - path: "server/services/translation.js"
      provides: "Google Cloud Translation API wrapper"
      exports: ["translateToHebrew", "detectLanguage"]
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
Set up translation service and integrate with task completion endpoint.

Purpose: Enable automatic translation of employee notes from their language to Hebrew. When an employee writes a note in English, Russian, or Arabic, the server translates it before storing, ensuring managers can read all notes in Hebrew. Translation happens server-side when note is submitted to minimize API costs.

Output: Translation service configured with Google Cloud Translation API, database stores original language, task completion endpoint translates non-Hebrew notes.
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
  <name>Install Google Cloud Translation API client</name>
  <files>package.json</files>
  <action>
Install official Google Cloud Translation API client library.

Command:
```bash
cd "c:\dev\projects\claude projects\eden claude"
npm install @google-cloud/translate --save
```

This installs @google-cloud/translate v9.x (API v2 - simpler for basic translation).

Do NOT install @vitalets/google-translate-api (unofficial, rate-limited, not production-ready per RESEARCH.md).

Note: This library requires GOOGLE_APPLICATION_CREDENTIALS environment variable pointing to service account JSON key file. User setup required (see frontmatter user_setup section).
  </action>
  <verify>
```bash
npm list @google-cloud/translate
```
Should show @google-cloud/translate@9.x.x in dependencies.
  </verify>
  <done>package.json contains @google-cloud/translate in dependencies.</done>
</task>

<task type="auto">
  <name>Create translation service wrapper</name>
  <files>server/services/translation.js</files>
  <action>
Create translation service that wraps Google Cloud Translation API with error handling and Hebrew-specific logic.

File: `server/services/translation.js`

Pattern from RESEARCH.md "Automatic Translation Service":

```javascript
const { Translate } = require('@google-cloud/translate').v2;

class TranslationService {
  constructor() {
    // Check if credentials are configured
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      console.warn('⚠️ GOOGLE_APPLICATION_CREDENTIALS not set - translation will be disabled');
      this.translate = null;
    } else {
      try {
        this.translate = new Translate();
        console.log('✓ Google Cloud Translation API initialized');
      } catch (error) {
        console.error('✗ Failed to initialize Translation API:', error.message);
        this.translate = null;
      }
    }
  }

  /**
   * Translate text to Hebrew
   * @param {string} text - Text to translate
   * @param {string} sourceLanguage - Source language code (en, ru, ar)
   * @returns {Promise<string>} - Translated text in Hebrew
   */
  async translateToHebrew(text, sourceLanguage) {
    if (!text || !text.trim()) {
      return '';
    }

    if (sourceLanguage === 'he') {
      return text; // Already Hebrew, no translation needed
    }

    if (!this.translate) {
      console.warn('Translation API not available, returning original text');
      return text; // Fallback: return original text
    }

    try {
      const [translation] = await this.translate.translate(text, {
        from: sourceLanguage,
        to: 'he'
      });

      console.log(`Translated (${sourceLanguage}→he): "${text.substring(0, 50)}..." → "${translation.substring(0, 50)}..."`);
      return translation;
    } catch (error) {
      console.error('Translation error:', error.message);
      // Fallback: return original text with error prefix
      return `[שגיאת תרגום] ${text}`;
    }
  }

  /**
   * Detect language of text
   * @param {string} text - Text to detect
   * @returns {Promise<string>} - Language code (he, en, ru, ar, etc.)
   */
  async detectLanguage(text) {
    if (!text || !text.trim()) {
      return 'he'; // Default to Hebrew for empty text
    }

    if (!this.translate) {
      console.warn('Translation API not available, defaulting to Hebrew');
      return 'he';
    }

    try {
      const [detection] = await this.translate.detect(text);
      const detectedLang = detection.language;
      console.log(`Detected language: ${detectedLang} (confidence: ${detection.confidence})`);
      return detectedLang;
    } catch (error) {
      console.error('Language detection error:', error.message);
      return 'he'; // Default to Hebrew on error
    }
  }
}

// Export singleton instance
module.exports = new TranslationService();
```

Key points:
- Graceful degradation if GOOGLE_APPLICATION_CREDENTIALS not set (logs warning, returns original text)
- Skip translation if source language is Hebrew
- Error handling returns original text with "[שגיאת תרגום]" prefix
- Console logs for debugging translation flow
- Singleton pattern (one instance shared across app)
  </action>
  <verify>
Test translation service (requires GOOGLE_APPLICATION_CREDENTIALS set):

```bash
node -e "
const translation = require('./server/services/translation.js');

async function test() {
  // Test English to Hebrew
  const result1 = await translation.translateToHebrew('Water leak found in bathroom', 'en');
  console.log('EN→HE:', result1);

  // Test Russian to Hebrew
  const result2 = await translation.translateToHebrew('Обнаружена утечка воды', 'ru');
  console.log('RU→HE:', result2);

  // Test Hebrew (should return as-is)
  const result3 = await translation.translateToHebrew('נמצאה דליפת מים', 'he');
  console.log('HE→HE:', result3);

  // Test language detection
  const lang1 = await translation.detectLanguage('Water leak');
  console.log('Detected:', lang1, '(should be en)');
}

test().catch(console.error);
"
```

Expected output (if credentials configured):
- EN→HE: נמצאה דליפת מים בחדר האמבטיה (or similar Hebrew translation)
- RU→HE: נמצאה דליפת מים
- HE→HE: נמצאה דליפת מים
- Detected: en (should be en)

If credentials NOT configured:
- Logs warnings, returns original text
  </verify>
  <done>server/services/translation.js exists, exports translateToHebrew and detectLanguage functions, handles missing credentials gracefully, logs translation operations.</done>
</task>

<task type="auto">
  <name>Add original_language column to tasks table</name>
  <files>server/database/schema.js</files>
  <action>
Add column to store the original language of completion notes.

In `server/database/schema.js`, add migration after other task column migrations:

```javascript
// Add original_language column if it doesn't exist (migration for Phase 5 note translation)
try {
  db.exec(`ALTER TABLE tasks ADD COLUMN original_language TEXT CHECK(original_language IN ('he', 'en', 'ru', 'ar'))`);
  console.log('Added original_language column to tasks table');
} catch (e) {
  // Column already exists, ignore error
  if (!e.message.includes('duplicate column name')) {
    console.error('Error adding original_language column:', e.message);
  }
}
```

This column stores the language the employee wrote their note in:
- NULL: No note, or note in Hebrew (default/no translation needed)
- 'en': Note was in English, completion_note contains Hebrew translation
- 'ru': Note was in Russian, completion_note contains Hebrew translation
- 'ar': Note was in Arabic, completion_note contains Hebrew translation

Manager UI uses this to show translation indicator ("🇬🇧 מתורגם מאנגלית").
  </action>
  <verify>
Restart server to run migration, then check schema:
```bash
node -e "
const { db } = require('./server/database/schema.js');
const result = db.prepare('PRAGMA table_info(tasks)').all();
const col = result.find(c => c.name === 'original_language');
console.log('original_language column:', col);
"
```
Should output column with type TEXT and CHECK constraint.
  </verify>
  <done>tasks table has original_language column with CHECK constraint (he, en, ru, ar), NULL allowed for no translation.</done>
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

  if (employeeLanguage !== 'he') {
    // Employee's language is not Hebrew, translate note
    console.log(`Translating note from ${employeeLanguage} to Hebrew...`);
    translatedNote = await translation.translateToHebrew(note.trim(), employeeLanguage);
    originalLanguage = employeeLanguage;
  }

  // Save translated note and original language
  db.prepare(`
    UPDATE tasks SET completion_note = ?, original_language = ? WHERE id = ?
  `).run(translatedNote, originalLanguage, taskId);

  console.log(`Note saved (original language: ${originalLanguage || 'he'})`);
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
   const task = db.prepare('SELECT completion_note, original_language FROM tasks WHERE id = 123').get();
   console.log('Note:', task.completion_note);
   console.log('Original language:', task.original_language);
   "
   ```
   Should show Hebrew translation of "Water leak found in the bathroom" and original_language = 'en'.

5. **Test Hebrew employee (no translation):**
   - Create Hebrew employee, complete task with Hebrew note
   - Verify completion_note stays in Hebrew, original_language is NULL

6. **Check server logs:**
   Should see: "Translating note from en to Hebrew..." and "Note saved (original language: en)"
  </verify>
  <done>Task completion endpoint translates non-Hebrew notes to Hebrew using translation service, stores translated text in completion_note, stores source language in original_language column.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
Translation service integrated with task completion flow. Employee notes in English, Russian, or Arabic are automatically translated to Hebrew and stored with original language indicator.
  </what-built>
  <how-to-verify>
**Prerequisites:**
1. Set GOOGLE_APPLICATION_CREDENTIALS environment variable pointing to service account JSON key
2. Restart server to load credentials

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
- Original language stored
- Hebrew notes unchanged
- No errors in server logs
  </how-to-verify>
  <resume-signal>
Type "approved" if translation works correctly, or describe any issues found (translation quality, errors, etc.)
  </resume-signal>
</task>

</tasks>

<verification>
Translation service setup verification:

1. **Environment setup:**
   - GOOGLE_APPLICATION_CREDENTIALS environment variable set
   - Translation API enabled in Google Cloud Console
   - Service account has "Cloud Translation API User" role

2. **Package installation:**
   ```bash
   npm list @google-cloud/translate
   ```

3. **Translation service functional:**
   ```bash
   node -e "
   const translation = require('./server/services/translation.js');
   translation.translateToHebrew('Test message', 'en').then(result => {
     console.log('Translation result:', result);
   });
   "
   ```

4. **Database schema:**
   ```bash
   node -e "
   const { db } = require('./server/database/schema.js');
   const info = db.prepare('PRAGMA table_info(tasks)').all();
   console.log(info.find(col => col.name === 'original_language'));
   "
   ```

5. **Task completion endpoint:**
   - Endpoint is async
   - Imports translation service
   - Queries employee language
   - Calls translateToHebrew for non-Hebrew employees
   - Stores original_language in database

6. **Checkpoint approved:**
   - User has tested translation with multiple languages
   - Translation quality acceptable
   - No errors in production
</verification>

<success_criteria>
1. @google-cloud/translate installed in package.json
2. server/services/translation.js exists, exports translateToHebrew and detectLanguage
3. Translation service handles missing credentials gracefully
4. tasks.original_language column exists with CHECK constraint
5. Task completion endpoint is async
6. Task completion endpoint translates non-Hebrew notes
7. Translated note stored in completion_note, source language in original_language
8. Hebrew notes not translated, original_language stays NULL
9. Translation errors logged but don't crash server
10. Checkpoint approved: translation quality acceptable
</success_criteria>

<output>
After completion, create `.planning/phases/05-multi-language-support/05-05a-SUMMARY.md`

Document:
- Translation service architecture (Google Cloud Translation API wrapper)
- Database schema addition (original_language column)
- Translation flow (employee submits → detect language → translate → store)
- User setup completed (Google Cloud credentials)
- Fallback behavior (missing credentials, translation errors)
- Cost implications (Translation API pricing: $20/1M characters)
- Next steps: Add UI indicators in manager interface (Plan 05b)
</output>
