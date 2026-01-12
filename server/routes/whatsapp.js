const express = require('express');
const router = express.Router();
const whatsappService = require('../services/whatsapp');
const htmlGenerator = require('../services/htmlGenerator');
const axios = require('axios');

// Function to shorten URL using TinyURL
async function shortenUrl(longUrl) {
  try {
    const response = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`);
    return response.data;
  } catch (error) {
    console.error('Error shortening URL:', error);
    return longUrl; // Return original URL if shortening fails
  }
}

// Get WhatsApp connection status
router.get('/status', (req, res) => {
  try {
    const status = whatsappService.getStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Initialize WhatsApp connection and get QR code
router.post('/connect', async (req, res) => {
  try {
    // Initialize if not already initialized
    if (!whatsappService.getStatus().isInitialized) {
      whatsappService.initialize();
    }

    // Get QR code
    const qrCode = await whatsappService.getQRCode();

    if (!qrCode) {
      // Already authenticated or timeout
      const status = whatsappService.getStatus();
      if (status.isReady) {
        return res.json({
          success: true,
          message: 'כבר מחובר לוואטסאפ',
          isReady: true
        });
      } else {
        return res.status(408).json({
          error: 'נסה שוב - לא הצלחנו ליצור קוד QR'
        });
      }
    }

    res.json({ qrCode });
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
    const { tasksByEmployee } = req.body;
    // tasksByEmployee format: { employeeId: { phone, name, tasks: [...] } }

    if (!tasksByEmployee || Object.keys(tasksByEmployee).length === 0) {
      return res.status(400).json({ error: 'לא נמצאו משימות לשליחה' });
    }

    // Check if WhatsApp is ready
    const status = whatsappService.getStatus();
    if (!status.isReady) {
      return res.status(400).json({
        error: 'וואטסאפ אינו מחובר. אנא התחבר תחילה דרך ההגדרות'
      });
    }

    const results = [];
    const crypto = require('crypto');
    const { db } = require('../database/schema');

    // Send to each employee
    for (const [employeeId, data] of Object.entries(tasksByEmployee)) {
      try {
        const { phone, name, tasks, date } = data;

        if (!phone) {
          results.push({
            employeeId,
            name,
            success: false,
            error: 'אין מספר טלפון לעובד'
          });
          continue;
        }

        // Generate confirmation token
        const token = crypto.randomBytes(32).toString('hex');
        const taskIds = tasks.map(t => t.id);

        // Token expires in 30 days
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        // Store token in database
        const stmt = db.prepare(`
          INSERT INTO task_confirmations (token, employee_id, task_ids, expires_at)
          VALUES (?, ?, ?, ?)
        `);
        stmt.run(token, employeeId, JSON.stringify(taskIds), expiresAt.toISOString());

        // Generate HTML page with tasks
        const htmlUrl = await htmlGenerator.generateTaskHtml({
          token: token,
          employeeName: name,
          tasks: sortedTasks,
          isAcknowledged: false,
          acknowledgedAt: null
        });

        // Shorten the URL for better WhatsApp compatibility
        const shortUrl = await shortenUrl(htmlUrl);

        // Build message with all tasks
        let message = `שלום ${name},\n\n`;
        message += `משימות ליום ${date}:\n\n`;

        // Sort tasks by time
        const sortedTasks = tasks.sort((a, b) => a.start_time.localeCompare(b.start_time));

        sortedTasks.forEach((task, index) => {
          message += `${index + 1}. ${task.start_time} - ${task.title}\n`;
          if (task.description) {
            message += `   ${task.description}\n`;
          }
          message += '\n';
        });

        message += `\n📱 *לצפייה אינטרקטיבית ואישור קבלה - קישור יגיע בהודעה הבאה*`;

        // Send the message
        await whatsappService.sendMessage(phone, message);

        // Send the shortened link as a separate message to ensure it's clickable
        await whatsappService.sendMessage(phone, shortUrl);

        results.push({
          employeeId,
          name,
          success: true,
          taskCount: tasks.length,
          confirmationUrl: htmlUrl
        });
      } catch (error) {
        results.push({
          employeeId,
          name: data.name,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    res.json({
      success: true,
      message: `נשלחו ${successCount} הודעות בהצלחה${failureCount > 0 ? `, ${failureCount} נכשלו` : ''}`,
      results
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
