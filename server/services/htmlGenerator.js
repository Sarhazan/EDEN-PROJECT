const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class HtmlGeneratorService {
  constructor() {
    this.templatePath = path.join(__dirname, '..', 'templates', 'task-confirmation.html');
    this.outputDir = path.join(__dirname, '..', '..', 'docs');
    this.baseUrl = 'https://sarhazan.github.io/EDEN-PROJECT';
  }

  /**
   * Generate HTML file for employee tasks
   * @param {Object} data - { token, employeeName, tasks, isAcknowledged, acknowledgedAt }
   * @returns {string} - URL to the generated HTML file
   */
  async generateTaskHtml(data) {
    try {
      console.log('Generating HTML for token:', data.token);

      // Read template
      const template = fs.readFileSync(this.templatePath, 'utf8');
      console.log('Template loaded successfully');

      // Prepare API URL
      const apiUrl = process.env.API_URL || 'http://192.168.1.35:3001';

      // Replace placeholders
      let html = template
        .replace(/\{\{API_URL\}\}/g, apiUrl)
        .replace(/\{\{TOKEN\}\}/g, data.token)
        .replace(/\{\{EMPLOYEE_NAME\}\}/g, data.employeeName)
        .replace(/\{\{TASKS_JSON\}\}/g, JSON.stringify(data.tasks))
        .replace(/\{\{IS_ACKNOWLEDGED\}\}/g, data.isAcknowledged ? 'true' : 'false')
        .replace(/\{\{ACKNOWLEDGED_AT\}\}/g, data.acknowledgedAt || '');

      // Generate filename
      const filename = `task-${data.token}.html`;
      const filepath = path.join(this.outputDir, filename);

      // Write HTML file
      fs.writeFileSync(filepath, html, 'utf8');
      console.log('HTML file written:', filepath);

      // Commit and push to GitHub
      await this.pushToGitHub(filename);

      // Return public URL
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

      // Add file to git
      execSync(`git add docs/${filename}`, { cwd: projectRoot, stdio: 'ignore' });

      // Commit
      const commitMessage = `Add task confirmation page: ${filename}`;
      try {
        execSync(`git commit -m "${commitMessage}"`, { cwd: projectRoot, stdio: 'ignore' });
      } catch (e) {
        // Nothing to commit is okay
        if (!e.message.includes('nothing to commit')) {
          throw e;
        }
      }

      // Push in background (don't wait for it)
      setTimeout(() => {
        try {
          execSync('git push', { cwd: projectRoot, stdio: 'ignore' });
          console.log(`Successfully pushed ${filename} to GitHub`);
        } catch (err) {
          console.error('Error pushing to GitHub:', err.message);
        }
      }, 100);

    } catch (error) {
      console.error('Error in git operations:', error.message);
      // Don't throw - we still want to return the URL
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
