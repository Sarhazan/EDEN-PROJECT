const express = require('express');
const router = express.Router();
const whatsappService = require('../services/whatsapp');

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

        // Build message with all tasks
        let message = `משימות ליום ${date}\n\n`;

        // Sort tasks by time
        const sortedTasks = tasks.sort((a, b) => a.start_time.localeCompare(b.start_time));

        sortedTasks.forEach((task, index) => {
          message += `${index + 1}. ${task.start_time} - ${task.title}\n`;
          if (task.description) {
            message += `   ${task.description}\n`;
          }
          message += '\n';
        });

        // Send the message
        await whatsappService.sendMessage(phone, message);

        results.push({
          employeeId,
          name,
          success: true,
          taskCount: tasks.length
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
