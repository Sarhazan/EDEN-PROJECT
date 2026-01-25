const express = require('express');
const cors = require('cors');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(cors());
app.use(express.json());

// WhatsApp client
let client = null;
let isReady = false;
let qrCode = null;

// Initialize WhatsApp client
async function initializeWhatsApp() {
  console.log('🚀 Initializing WhatsApp client...');

  client = new Client({
    authStrategy: new LocalAuth({
      clientId: 'eden-whatsapp-local'
    }),
    puppeteer: {
      headless: false, // Show browser window for debugging
      args: ['--no-sandbox']
    }
  });

  // QR Code event
  client.on('qr', (qr) => {
    console.log('\n📱 QR CODE RECEIVED - Scan with your phone:\n');
    qrcode.generate(qr, { small: true });
    qrCode = qr;
    isReady = false;
  });

  // Ready event
  client.on('ready', () => {
    console.log('✅ WhatsApp client is ready!');
    isReady = true;
    qrCode = null;
  });

  // Authenticated event
  client.on('authenticated', () => {
    console.log('✅ WhatsApp authenticated successfully');
  });

  // Disconnected event
  client.on('disconnected', (reason) => {
    console.log('❌ WhatsApp disconnected:', reason);
    isReady = false;
    client = null;
  });

  // Initialize
  await client.initialize();
}

// API Routes

// Get status
app.get('/status', (req, res) => {
  res.json({
    isReady,
    hasQR: qrCode !== null,
    isInitialized: client !== null
  });
});

// Get QR code
app.get('/qr', (req, res) => {
  if (qrCode) {
    res.json({ qrCode });
  } else if (isReady) {
    res.json({ message: 'Already authenticated' });
  } else {
    res.status(404).json({ error: 'QR code not available yet' });
  }
});

// Send message
app.post('/send', async (req, res) => {
  try {
    const { phoneNumber, message } = req.body;

    if (!phoneNumber || !message) {
      return res.status(400).json({ error: 'Phone number and message are required' });
    }

    if (!isReady) {
      return res.status(400).json({ error: 'WhatsApp is not ready. Please authenticate first.' });
    }

    // Format phone number for WhatsApp
    let formattedNumber = phoneNumber.replace(/\D/g, '');

    // Add Israel country code if not present
    if (!formattedNumber.startsWith('972')) {
      formattedNumber = '972' + formattedNumber.replace(/^0+/, '');
    }

    const chatId = `${formattedNumber}@c.us`;

    console.log(`📤 Sending message to ${chatId}...`);

    // Send the message
    await client.sendMessage(chatId, message);

    console.log('✅ Message sent successfully');
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error sending message:', error);

    // Detect frame detachment - this means the browser frame is broken
    if (error.message && error.message.includes('detached Frame')) {
      console.error('🔴 Frame detached - client is broken, resetting state');
      isReady = false;

      try {
        await client.destroy();
      } catch (destroyError) {
        console.error('Error destroying client:', destroyError);
      }

      client = null;
      return res.status(503).json({
        error: 'חיבור WhatsApp התנתק. יש להתחבר מחדש דרך ההגדרות'
      });
    }

    res.status(500).json({ error: error.message });
  }
});

// Send bulk messages
app.post('/send-bulk', async (req, res) => {
  try {
    const { messages } = req.body; // Array of { phoneNumber, message }

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    if (!isReady) {
      return res.status(400).json({ error: 'WhatsApp is not ready. Please authenticate first.' });
    }

    const results = [];

    for (const { phoneNumber, message } of messages) {
      try {
        let formattedNumber = phoneNumber.replace(/\D/g, '');
        if (!formattedNumber.startsWith('972')) {
          formattedNumber = '972' + formattedNumber.replace(/^0+/, '');
        }
        const chatId = `${formattedNumber}@c.us`;

        await client.sendMessage(chatId, message);
        results.push({ phoneNumber, success: true });
        console.log(`✅ Sent to ${phoneNumber}`);

        // Small delay between messages
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`❌ Failed to send to ${phoneNumber}:`, error.message);

        // Detect frame detachment during bulk send
        if (error.message && error.message.includes('detached Frame')) {
          console.error('🔴 Frame detached during bulk send - client is broken, resetting state');
          isReady = false;

          try {
            await client.destroy();
          } catch (destroyError) {
            console.error('Error destroying client:', destroyError);
          }

          client = null;

          // Stop bulk send immediately and return error
          return res.status(503).json({
            error: 'חיבור WhatsApp התנתק. יש להתחבר מחדש דרך ההגדרות',
            partialResults: results
          });
        }

        results.push({ phoneNumber, success: false, error: error.message });
      }
    }

    res.json({ success: true, results });
  } catch (error) {
    console.error('❌ Error in bulk send:', error);
    res.status(500).json({ error: error.message });
  }
});

// Disconnect
app.post('/disconnect', async (req, res) => {
  try {
    if (client) {
      await client.destroy();
      client = null;
      isReady = false;
      qrCode = null;
      console.log('🔌 WhatsApp disconnected');
      res.json({ success: true });
    } else {
      res.json({ success: true, message: 'Already disconnected' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', async () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🌿 Eden WhatsApp Gateway');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Local: http://localhost:${PORT}`);
  console.log(`🌐 Network: http://192.168.1.35:${PORT}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Initialize WhatsApp
  await initializeWhatsApp();
});
