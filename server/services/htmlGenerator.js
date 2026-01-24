const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class HtmlGeneratorService {
  constructor() {
    this.templatePath = path.join(__dirname, '..', 'templates', 'task-confirmation.html');
    this.outputDir = path.join(__dirname, '..', '..', 'docs');
    // For local testing, serve from local server
    // For production, use Vercel or ngrok URL
    const apiUrl = process.env.PUBLIC_API_URL || process.env.API_URL || 'http://localhost:3002';
    this.baseUrl = process.env.VERCEL_PROJECT_URL || `${apiUrl}/docs`;
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

      // Prepare API URL - use PUBLIC_API_URL for external access, fallback to API_URL
      const apiUrl = process.env.PUBLIC_API_URL || process.env.API_URL || 'http://192.168.1.35:3002';

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
