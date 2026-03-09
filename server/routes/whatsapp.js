const express = require('express');
const router = express.Router();
const whatsappService = require('../services/whatsapp');
const htmlGenerator = require('../services/htmlGenerator');
const urlShortener = require('../services/urlShortener');
const i18n = require('../services/i18n');
const { db } = require('../database/schema');

// Function to check if URL is accessible
async function waitForUrlAvailable(url, maxAttempts = 30, intervalMs = 4000) {
  console.log(`⏳ Waiting for URL to become available: ${url}`);
  console.log(`   Will try ${maxAttempts} times with ${intervalMs/1000}s intervals (max ${maxAttempts * intervalMs / 1000}s total)`);

  const axios = require('axios');
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await axios.head(url, { timeout: 8000 });
      if (response.status === 200) {
        console.log(`✓ URL is available after ${attempt} attempts (${attempt * intervalMs / 1000}s elapsed)`);
        return true;
      }
    } catch (error) {
      const errorMsg = error.response?.status || error.code || 'unknown error';
      console.log(`   Attempt ${attempt}/${maxAttempts}: Not ready yet (${errorMsg})`);

      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    }
  }

  console.error(`✗ URL STILL NOT AVAILABLE after ${maxAttempts} attempts (${maxAttempts * intervalMs / 1000}s total)`);
  console.error(`   This means Vercel deployment is taking too long or failed.`);
  return false;
}

// Get WhatsApp connection status
router.get('/status', async (req, res) => {
  try {
    const status = whatsappService.getStatus();
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Initialize WhatsApp connection and get QR code
router.post('/connect', async (req, res) => {
  try {
    const status = whatsappService.getStatus();

    if (status.isReady) {
      return res.json({ success: true, message: 'Already connected', isReady: true });
    }

    if (!status.isInitialized) {
      // Start initialization - QR will come via Socket.IO
      whatsappService.initialize().catch(err => {
        console.error('WhatsApp initialization error:', err);
      });
    }

    // Return immediately - frontend should listen for Socket.IO events
    res.json({ success: true, message: 'Initializing - watch for QR via Socket.IO', initializing: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current QR code as data URL (HTTP fallback when Socket.IO doesn't deliver it)
router.get('/qr', async (req, res) => {
  try {
    const qrDataUrl = whatsappService.getQrDataUrl ? whatsappService.getQrDataUrl() : null;
    if (!qrDataUrl) {
      return res.status(404).json({ error: 'אין QR זמין כרגע — נסה לאתחל חיבור' });
    }
    res.json({ qrDataUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Disconnect WhatsApp
router.post('/disconnect', async (req, res) => {
  try {
    await whatsappService.disconnect();
    res.json({ success: true, message: 'התנתקת מוואטסאפ בהצלחה' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send WhatsApp message
router.post('/send', async (req, res) => {
  try {
    const { phoneNumber, message } = req.body;

    if (!phoneNumber || !message) {
      return res.status(400).json({ error: 'חסרים פרטים: מספר טלפון והודעה' });
    }

    // Check if WhatsApp is ready
    const status = whatsappService.getStatus();
    if (!status.isReady) {
      return res.status(400).json({
        error: 'וואטסאפ אינו מחובר. אנא התחבר תחילה דרך ההגדרות'
      });
    }

    // Send the message
    await whatsappService.sendMessage(phoneNumber, message);

    res.json({
      success: true,
      message: 'ההודעה נשלחה בהצלחה'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send bulk WhatsApp messages (grouped by employee)
router.post('/send-bulk', async (req, res) => {
  try {
    console.log('=== BULK SEND START ===');
    const { tasksByEmployee } = req.body;
    // tasksByEmployee format: { employeeId: { phone, name, tasks: [...] } }

    if (!tasksByEmployee || Object.keys(tasksByEmployee).length === 0) {
      console.error('No tasks to send');
      return res.status(400).json({ error: 'לא נמצאו משימות לשליחה' });
    }

    console.log(`Processing bulk send for ${Object.keys(tasksByEmployee).length} employees`);

    // Check if WhatsApp is ready
    const status = whatsappService.getStatus();
    if (!status.isReady) {
      console.error('WhatsApp not ready');
      return res.status(400).json({
        error: 'וואטסאפ אינו מחובר. אנא התחבר תחילה דרך ההגדרות'
      });
    }

    console.log('WhatsApp is ready, proceeding with send');

    const results = [];
    const crypto = require('crypto');

    // Send to each employee
    for (const [employeeId, data] of Object.entries(tasksByEmployee)) {
      try {
        console.log(`\n--- Processing employee ${employeeId} ---`);
        let { phone, name, tasks, date, language, extraTasks } = data;
        console.log(`Employee: ${name}, Phone: ${phone}, Tasks: ${tasks.length}`);

        // Always verify language from DB (client value may be stale or defaulted to 'he')
        const employeeRow = db.prepare('SELECT language FROM employees WHERE id = ?').get(employeeId);
        const employeeLanguage = employeeRow?.language || language || 'he';
        console.log(`Employee ${name} language: ${employeeLanguage} (db: ${employeeRow?.language}, client sent: ${language})`);

        // Get translations for this employee's language
        const t = i18n.getFixedT(employeeLanguage, 'whatsapp');

        if (!phone) {
          console.error(`No phone number for employee ${name}`);
          results.push({
            employeeId,
            name,
            success: false,
            error: 'אין מספר טלפון לעובד'
          });
          continue;
        }

        // Generate confirmation token
        console.log('Generating confirmation token...');
        const token = crypto.randomBytes(32).toString('hex');
        const taskIds = tasks.map(t => t.id);
        console.log(`Token generated: ${token.substring(0, 8)}...`);

        // Token expires in 30 days
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        // Store token in database
        console.log('Storing token in database...');
        const stmt = db.prepare(`
          INSERT INTO task_confirmations (token, employee_id, task_ids, expires_at)
          VALUES (?, ?, ?, ?)
        `);
        stmt.run(token, employeeId, JSON.stringify(taskIds), expiresAt.toISOString());
        console.log('Token stored successfully');

        // Sort tasks by time (guard against null start_time)
        const sortedTasks = tasks.sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));

        // Generate HTML page with tasks
        console.log(`Generating HTML for employee ${name} with ${sortedTasks.length} tasks`);
        const htmlUrl = await htmlGenerator.generateTaskHtml({
          token: token,
          employeeName: name,
          tasks: sortedTasks,
          isAcknowledged: false,
          acknowledgedAt: null
        });
        console.log(`HTML generated successfully: ${htmlUrl}`);

        // Skip URL verification - file is created locally and will be available on Railway after deploy
        // The URL points to Railway but file is generated locally during development
        console.log('✓ HTML file generated, skipping URL verification');

        // Shorten the URL for cleaner WhatsApp messages
        console.log('Shortening URL for WhatsApp...');
        const shortUrl = await urlShortener.shorten(htmlUrl);
        console.log(`URL to send: ${shortUrl}`);

        // Build translated message
        let message = t('greeting', { name }) + '\n\n';
        message += t('taskListHeader', { date, count: tasks.length }) + '\n\n';

        // Translate task titles and descriptions to employee's language
        const translationService = require('../services/translation');

        for (const [index, task] of sortedTasks.entries()) {
          // Translate title and description if employee language is not Hebrew
          let translatedTitle = task.title;
          let translatedDescription = task.description;

          if (language && language !== 'he') {
            try {
              const titleResult = await translationService.translateFromHebrew(task.title, language);
              translatedTitle = titleResult.translation;

              if (task.description) {
                const descResult = await translationService.translateFromHebrew(task.description, language);
                translatedDescription = descResult.translation;
              }
            } catch (error) {
              console.warn(`Translation failed for task ${task.id}, using original text:`, error.message);
            }
          }

          message += `${index + 1}. ${task.start_time} - ${translatedTitle}\n`;
          if (translatedDescription) {
            message += `   ${translatedDescription}\n`;
          }
          message += '\n';
        }

        if (extraTasks && extraTasks.length > 0) {
          message += '\n' + t('extraTasksHeader') + '\n';
          for (const et of extraTasks) {
            let translatedTitle = et.title;
            let translatedDescription = et.description;
            if (language && language !== 'he') {
              try {
                const r = await translationService.translateFromHebrew(et.title, language);
                translatedTitle = r.translation;
                if (et.description) {
                  const r2 = await translationService.translateFromHebrew(et.description, language);
                  translatedDescription = r2.translation;
                }
              } catch {}
            }
            message += `• ${translatedTitle}\n`;
            if (translatedDescription) message += `  ${translatedDescription}\n`;
          }
          message += '\n';
        }

        message += '\n📱 ' + t('clickToView');

        // Send the message
        console.log('Sending task list message...');
        await whatsappService.sendMessage(phone, message);
        console.log('Task list message sent successfully');

        // Send the short link as a separate message to ensure it's clickable
        console.log('Sending link message...');
        await whatsappService.sendMessage(phone, shortUrl);
        console.log('Link message sent successfully');

        // Update task statuses to 'sent' in DB
        if (taskIds.length > 0) {
          const placeholders = taskIds.map(() => '?').join(',');
          db.prepare(`UPDATE tasks SET status = 'sent' WHERE id IN (${placeholders})`).run(...taskIds);
          console.log(`✓ Updated ${taskIds.length} tasks to status 'sent'`);
        }

        results.push({
          employeeId,
          name,
          success: true,
          taskCount: tasks.length,
          confirmationUrl: htmlUrl,
          shortUrl: shortUrl
        });
        console.log(`✓ Successfully sent to ${name}`);
      } catch (error) {
        console.error(`✗ Error sending to employee ${employeeId}:`, error);
        results.push({
          employeeId,
          name: data.name,
          success: false,
          error: error.message
        });
      }
    }

    console.log('\n=== BULK SEND COMPLETE ===');

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log(`Results: ${successCount} success, ${failureCount} failures`);

    res.json({
      success: true,
      message: `נשלחו ${successCount} הודעות בהצלחה${failureCount > 0 ? `, ${failureCount} נכשלו` : ''}`,
      results
    });
  } catch (error) {
    console.error('Error in bulk send endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

// Send single task with full confirmation flow
router.post('/send-single-task', async (req, res) => {
  try {
    const { taskId, employeeId } = req.body;
    if (!taskId || !employeeId) {
      return res.status(400).json({ error: 'חסרים פרטים' });
    }
    const status = whatsappService.getStatus();
    if (!status.isReady) {
      return res.status(400).json({ error: 'וואטסאפ אינו מחובר' });
    }
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
    if (!task) return res.status(404).json({ error: 'משימה לא נמצאה' });
    const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(employeeId);
    if (!employee || !employee.phone) {
      return res.status(400).json({ error: 'לעובד אין מספר טלפון' });
    }
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    db.prepare('INSERT INTO task_confirmations (token, employee_id, task_ids, expires_at) VALUES (?, ?, ?, ?)')
      .run(token, employeeId, JSON.stringify([taskId]), expiresAt.toISOString());
    const htmlUrl = await htmlGenerator.generateTaskHtml({
      token,
      employeeName: employee.name,
      tasks: [task],
      isAcknowledged: false,
      acknowledgedAt: null
    });
    const shortUrl = await urlShortener.shorten(htmlUrl);
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date());
    const timeLabel = (task.start_time && task.start_time !== '00:00') ? task.start_time.slice(0, 5) : 'ללא שעה';
    let message = `שלום ${employee.name}! 👋\n\nמשימה להיום (${today}):\n\n`;
    message += `• ${timeLabel} - ${task.title}\n`;
    if (task.description) message += `  ${task.description}\n`;
    message += `\n📱 לאישור ותמונה:`;
    await whatsappService.sendMessage(employee.phone, message);
    await whatsappService.sendMessage(employee.phone, shortUrl);
    res.json({ success: true, message: 'המשימה נשלחה בהצלחה' });
  } catch (error) {
    console.error('Error in send-single-task:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
