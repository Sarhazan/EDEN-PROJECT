const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const i18n = require('./i18n');
const { db } = require('../database/schema');
const translationService = require('./translation');

class HtmlGeneratorService {
  constructor() {
    this.templatePath = path.join(__dirname, '..', 'templates', 'task-confirmation.html');
    this.outputDir = path.join(__dirname, '..', '..', 'docs');
    // Use PUBLIC_API_URL for production (Render), fallback to local for development
    const apiUrl = process.env.PUBLIC_API_URL || process.env.API_URL || 'http://localhost:3002';
    this.baseUrl = `${apiUrl}/docs`;
    this.isProduction = !!process.env.PUBLIC_API_URL;
  }

  /**
   * Translate task content from Hebrew to target language
   * @param {Array} tasks - Array of task objects
   * @param {string} targetLanguage - Target language code (en, ru, ar)
   * @returns {Promise<Array>} - Array of tasks with translated content
   * @private
   */
  async _translateTasks(tasks, targetLanguage) {
    if (targetLanguage === 'he' || !tasks || tasks.length === 0) {
      return tasks; // No translation needed for Hebrew or empty tasks
    }

    console.log(`Translating ${tasks.length} tasks from Hebrew to ${targetLanguage}...`);
    const translatedTasks = [];

    for (const task of tasks) {
      const translatedTask = { ...task };

      // Translate title
      if (task.title) {
        const titleResult = await translationService.translateFromHebrew(task.title, targetLanguage);
        translatedTask.title = titleResult.translation;
        console.log(`  - Title: "${task.title}" → "${translatedTask.title}" (${titleResult.provider})`);
      }

      // Translate description
      if (task.description) {
        const descResult = await translationService.translateFromHebrew(task.description, targetLanguage);
        translatedTask.description = descResult.translation;
        console.log(`  - Desc: "${task.description.substring(0, 40)}..." → "${translatedTask.description.substring(0, 40)}..." (${descResult.provider})`);
      }

      // Translate system name
      if (task.system_name) {
        const systemResult = await translationService.translateFromHebrew(task.system_name, targetLanguage);
        translatedTask.system_name = systemResult.translation;
        console.log(`  - System: "${task.system_name}" → "${translatedTask.system_name}" (${systemResult.provider})`);
      }

      translatedTasks.push(translatedTask);
    }

    console.log(`✓ Translated all ${tasks.length} tasks successfully`);
    return translatedTasks;
  }

  /**
   * Generate HTML file for employee tasks
   * @param {Object} data - { token, employeeName, tasks, isAcknowledged, acknowledgedAt }
   * @returns {string} - URL to the generated HTML file
   */
  async generateTaskHtml(data) {
    try {
      console.log('Generating HTML for token:', data.token);

      // Get employee language from database via JOIN
      const result = db.prepare(`
        SELECT e.language
        FROM task_confirmations tc
        JOIN employees e ON tc.employee_id = e.id
        WHERE tc.token = ?
      `).get(data.token);

      const language = result?.language || 'he';
      console.log(`Generating HTML for language: ${language}`);

      // Get translations using getFixedT to lock language context
      let t;
      try {
        t = i18n.getFixedT(language, 'tasks');
      } catch (error) {
        console.error('Translation error, falling back to Hebrew:', error);
        t = i18n.getFixedT('he', 'tasks');
      }

      // Determine text direction: RTL for Hebrew and Arabic, LTR for English and Russian
      const textDirection = ['he', 'ar'].includes(language) ? 'rtl' : 'ltr';

      // Read template
      const template = fs.readFileSync(this.templatePath, 'utf8');
      console.log('Template loaded successfully');

      // Prepare API URL - use PUBLIC_API_URL for external access, fallback to API_URL
      const apiUrl = process.env.PUBLIC_API_URL || process.env.API_URL || 'http://192.168.1.35:3002';

      // Translate all UI strings
      const translations = {
        PAGE_TITLE: t('pageTitle'),
        GREETING: t('greeting', { name: data.employeeName }),
        ACKNOWLEDGE_BUTTON: t('acknowledgeButton'),
        ACKNOWLEDGE_DESCRIPTION: t('acknowledgeDescription'),
        ACKNOWLEDGE_REQUIRED: t('acknowledgeRequired'),
        COMPLETE_BUTTON: t('completeButton'),
        ADD_NOTE_LABEL: t('addNoteLabel'),
        ADD_NOTE_PLACEHOLDER: t('addNotePlaceholder'),
        UPLOAD_IMAGE_LABEL: t('uploadImageLabel'),
        UPLOAD_IMAGE_HINT: t('uploadImageHint'),
        TASK_COMPLETED: t('taskCompleted'),
        ACKNOWLEDGED_AT_TEXT: t('acknowledgedAtText'),
        LOADING: t('loading'),
        FOOTER_TEXT: t('footerText'),
        COMPLETION_DETAILS: t('completionDetails'),
        SENDING: t('sending'),
        ERROR: t('error'),
        ERROR_UNKNOWN: t('errorUnknown'),
        ERROR_SENDING: t('errorSending'),
        ACKNOWLEDGING: t('acknowledging'),
        ACKNOWLEDGE_SUCCESS: t('acknowledgeSuccess'),
        ACKNOWLEDGE_ERROR: t('acknowledgeError'),
        PRIORITY_URGENT: t('priority.urgent'),
        PRIORITY_NORMAL: t('priority.normal'),
        PRIORITY_OPTIONAL: t('priority.optional'),
        BADGE_TIME: t('badge.time'),
        BADGE_DURATION: t('badge.duration', { minutes: '{{minutes}}' }),
        BADGE_COMPLETED: t('badge.completed'),
        LANGUAGE: language,
        TEXT_DIRECTION: textDirection
      };

      // Translate task content if language is not Hebrew
      const tasksToInject = await this._translateTasks(data.tasks, language);

      // Replace translation placeholders
      let html = template;
      Object.keys(translations).forEach(key => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        html = html.replace(regex, translations[key]);
      });

      // Then replace existing data placeholders
      html = html
        .replace(/\{\{API_URL\}\}/g, apiUrl)
        .replace(/\{\{TOKEN\}\}/g, data.token)
        .replace(/\{\{EMPLOYEE_NAME\}\}/g, data.employeeName)
        .replace(/\{\{TASKS_JSON\}\}/g, JSON.stringify(tasksToInject))
        .replace(/\{\{IS_ACKNOWLEDGED\}\}/g, data.isAcknowledged ? 'true' : 'false')
        .replace(/\{\{ACKNOWLEDGED_AT\}\}/g, data.acknowledgedAt || '');

      // Generate filename
      const filename = `task-${data.token}.html`;
      const filepath = path.join(this.outputDir, filename);

      // Write HTML file
      fs.writeFileSync(filepath, html, 'utf8');
      console.log('HTML file written:', filepath);

      // Skip git operations for local testing - just serve directly
      // For production, uncomment this:
      // await this.pushToGitHub(filename);

      // Return local URL (served directly from Express static middleware)
      const publicUrl = `${this.baseUrl}/${filename}`;
      console.log('Generated URL:', publicUrl);
      return publicUrl;
    } catch (error) {
      console.error('Error generating HTML:', error);
      throw error;
    }
  }

  /**
   * Push HTML file to GitHub
   * @param {string} filename - Name of the file to push
   */
  async pushToGitHub(filename) {
    try {
      const projectRoot = path.join(__dirname, '..', '..');

      console.log(`📝 Starting git operations for ${filename}...`);

      // Add file to git
      console.log('   - Adding file to git...');
      execSync(`git add docs/${filename}`, { cwd: projectRoot, stdio: 'pipe' });

      // Commit
      const commitMessage = `Add task confirmation page: ${filename}`;
      try {
        console.log('   - Committing...');
        execSync(`git commit -m "${commitMessage}"`, { cwd: projectRoot, stdio: 'pipe' });
      } catch (e) {
        // Nothing to commit is okay
        if (!e.message.includes('nothing to commit')) {
          console.error('   ✗ Git commit failed:', e.message);
          throw e;
        }
        console.log('   - Nothing new to commit (file unchanged)');
      }

      // Push to GitHub
      console.log('   - Pushing to GitHub...');
      execSync('git push', { cwd: projectRoot, stdio: 'pipe' });
      console.log(`   ✓ Successfully pushed ${filename} to GitHub`);

      // Deploy to Vercel
      console.log('   - Triggering Vercel deployment...');
      const vercelOutput = execSync('vercel --prod --yes', { cwd: projectRoot, encoding: 'utf-8' });
      console.log('   ✓ Vercel deployment triggered');
      console.log('   Vercel output:', vercelOutput.trim().substring(0, 200));

    } catch (error) {
      console.error('✗ Error in git/Vercel operations:', error.message);
      if (error.stderr) {
        console.error('   stderr:', error.stderr.toString());
      }
      // Don't throw - we still want to return the URL and let waitForUrlAvailable handle verification
    }
  }

  /**
   * Generate HTML content for employee tasks (returns HTML string without saving to file)
   * Used for dynamic serving in cloud deployments where static files don't persist
   * @param {Object} data - { token, employeeName, tasks, isAcknowledged, acknowledgedAt, language }
   * @returns {string} - Generated HTML content
   */
  async generateTaskHtmlContent(data) {
    try {
      console.log('Generating HTML content for token:', data.token);

      const language = data.language || 'he';
      console.log(`Generating HTML for language: ${language}`);

      // Get translations using getFixedT to lock language context
      let t;
      try {
        t = i18n.getFixedT(language, 'tasks');
      } catch (error) {
        console.error('Translation error, falling back to Hebrew:', error);
        t = i18n.getFixedT('he', 'tasks');
      }

      // Determine text direction: RTL for Hebrew and Arabic, LTR for English and Russian
      const textDirection = ['he', 'ar'].includes(language) ? 'rtl' : 'ltr';

      // Read template
      const template = fs.readFileSync(this.templatePath, 'utf8');
      console.log('Template loaded successfully');

      // Prepare API URL - use PUBLIC_API_URL for external access, fallback to API_URL
      const apiUrl = process.env.PUBLIC_API_URL || process.env.API_URL || 'http://192.168.1.35:3002';

      // Translate all UI strings
      const translations = {
        PAGE_TITLE: t('pageTitle'),
        GREETING: t('greeting', { name: data.employeeName }),
        ACKNOWLEDGE_BUTTON: t('acknowledgeButton'),
        ACKNOWLEDGE_DESCRIPTION: t('acknowledgeDescription'),
        ACKNOWLEDGE_REQUIRED: t('acknowledgeRequired'),
        COMPLETE_BUTTON: t('completeButton'),
        ADD_NOTE_LABEL: t('addNoteLabel'),
        ADD_NOTE_PLACEHOLDER: t('addNotePlaceholder'),
        UPLOAD_IMAGE_LABEL: t('uploadImageLabel'),
        UPLOAD_IMAGE_HINT: t('uploadImageHint'),
        TASK_COMPLETED: t('taskCompleted'),
        ACKNOWLEDGED_AT_TEXT: t('acknowledgedAtText'),
        LOADING: t('loading'),
        FOOTER_TEXT: t('footerText'),
        COMPLETION_DETAILS: t('completionDetails'),
        SENDING: t('sending'),
        ERROR: t('error'),
        ERROR_UNKNOWN: t('errorUnknown'),
        ERROR_SENDING: t('errorSending'),
        ACKNOWLEDGING: t('acknowledging'),
        ACKNOWLEDGE_SUCCESS: t('acknowledgeSuccess'),
        ACKNOWLEDGE_ERROR: t('acknowledgeError'),
        PRIORITY_URGENT: t('priority.urgent'),
        PRIORITY_NORMAL: t('priority.normal'),
        PRIORITY_OPTIONAL: t('priority.optional'),
        BADGE_TIME: t('badge.time'),
        BADGE_DURATION: t('badge.duration', { minutes: '{{minutes}}' }),
        BADGE_COMPLETED: t('badge.completed'),
        LANGUAGE: language,
        TEXT_DIRECTION: textDirection
      };

      // Translate task content if language is not Hebrew
      const tasksToInject = await this._translateTasks(data.tasks, language);

      // Replace translation placeholders
      let html = template;
      Object.keys(translations).forEach(key => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        html = html.replace(regex, translations[key]);
      });

      // Debug: Log tasks before JSON stringify
      console.log('[generateTaskHtmlContent] Tasks to inject (first task title):', tasksToInject[0]?.title);
      console.log('[generateTaskHtmlContent] Language:', language);

      // Then replace existing data placeholders
      const tasksJson = JSON.stringify(tasksToInject);
      console.log('[generateTaskHtmlContent] Tasks JSON sample:', tasksJson.substring(0, 200));

      html = html
        .replace(/\{\{API_URL\}\}/g, apiUrl)
        .replace(/\{\{TOKEN\}\}/g, data.token)
        .replace(/\{\{EMPLOYEE_NAME\}\}/g, data.employeeName)
        .replace(/\{\{TASKS_JSON\}\}/g, tasksJson)
        .replace(/\{\{IS_ACKNOWLEDGED\}\}/g, data.isAcknowledged ? 'true' : 'false')
        .replace(/\{\{ACKNOWLEDGED_AT\}\}/g, data.acknowledgedAt || '');

      console.log('HTML content generated successfully for token:', data.token);
      return html;
    } catch (error) {
      console.error('Error generating HTML content:', error);
      throw error;
    }
  }

  /**
   * Delete old HTML files (older than 30 days)
   */
  async cleanOldFiles() {
    try {
      const files = fs.readdirSync(this.outputDir);
      const now = Date.now();
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;

      files.forEach(file => {
        if (file.startsWith('task-') && file.endsWith('.html')) {
          const filepath = path.join(this.outputDir, file);
          const stats = fs.statSync(filepath);
          const fileAge = now - stats.mtimeMs;

          if (fileAge > thirtyDays) {
            fs.unlinkSync(filepath);
            console.log(`Deleted old file: ${file}`);
          }
        }
      });
    } catch (error) {
      console.error('Error cleaning old files:', error);
    }
  }
}

module.exports = new HtmlGeneratorService();
