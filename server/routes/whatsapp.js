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

module.exports = router;
