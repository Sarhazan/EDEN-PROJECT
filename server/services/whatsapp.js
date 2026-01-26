const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');

/**
 * WhatsApp Service - Singleton with Socket.IO Integration
 *
 * This service manages the WhatsApp Web client directly in the main server process.
 * It emits real-time events via Socket.IO for QR codes and connection status.
 */
class WhatsAppService {
  constructor() {
    this.client = null;
    this.isReady = false;
    this.qrCode = null;
    this.io = null;
  }

  /**
   * Set Socket.IO instance for emitting events
   */
  setIo(io) {
    this.io = io;
    console.log('WhatsApp service connected to Socket.IO');
  }

  /**
   * Initialize WhatsApp client with LocalAuth and event handlers
   */
  async initialize() {
    console.log('🚀 Initializing WhatsApp client...');

    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: 'eden-whatsapp',
        dataPath: './.wwebjs_auth'
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      }
    });

    // QR Code event - generate and emit to all connected browsers
    this.client.on('qr', async (qr) => {
      console.log('📱 QR CODE RECEIVED');
      this.qrCode = qr;
      this.isReady = false;

      try {
        // Generate QR as data URL for browser display
        const qrDataUrl = await QRCode.toDataURL(qr, {
          width: 300,
          margin: 2
        });

        if (this.io) {
          this.io.emit('whatsapp:qr', { qrDataUrl });
          console.log('✓ QR code emitted to connected clients');
        }
      } catch (error) {
        console.error('Error generating QR code:', error);
      }
    });

    // Ready event
    this.client.on('ready', () => {
      console.log('✅ WhatsApp client is ready!');
      this.isReady = true;
      this.qrCode = null;

      if (this.io) {
        this.io.emit('whatsapp:ready');
      }
    });

    // Authenticated event
    this.client.on('authenticated', () => {
      console.log('✅ WhatsApp authenticated successfully');
    });

    // Disconnected event
    this.client.on('disconnected', (reason) => {
      console.log('❌ WhatsApp disconnected:', reason);
      this.isReady = false;
      this.client = null;

      if (this.io) {
        this.io.emit('whatsapp:disconnected', { reason });
      }
    });

    // Initialize client
    await this.client.initialize();
  }

  /**
   * Get current WhatsApp status
   */
  getStatus() {
    return {
      isReady: this.isReady,
      needsAuth: this.qrCode !== null,
      isInitialized: this.client !== null
    };
  }

  /**
   * Send WhatsApp message
   */
  async sendMessage(phoneNumber, message) {
    try {
      if (!this.isReady) {
        throw new Error('WhatsApp is not ready. Please authenticate first.');
      }

      // Format phone number for WhatsApp (Israel country code)
      let formattedNumber = phoneNumber.replace(/\D/g, '');

      // Add Israel country code if not present
      if (!formattedNumber.startsWith('972')) {
        formattedNumber = '972' + formattedNumber.replace(/^0+/, '');
      }

      const chatId = `${formattedNumber}@c.us`;

      console.log(`📤 Sending message to ${chatId}...`);

      // Send the message
      await this.client.sendMessage(chatId, message);

      console.log('✅ Message sent successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Error sending message:', error);

      // Detect frame detachment - this means the browser frame is broken
      if (error.message && error.message.includes('detached Frame')) {
        console.error('🔴 Frame detached - client is broken, resetting state');
        this.isReady = false;

        try {
          await this.client.destroy();
        } catch (destroyError) {
          console.error('Error destroying client:', destroyError);
        }

        this.client = null;

        if (this.io) {
          this.io.emit('whatsapp:disconnected', { reason: 'frame_detached' });
        }

        throw new Error('חיבור WhatsApp התנתק. יש להתחבר מחדש דרך ההגדרות');
      }

      throw error;
    }
  }

  /**
   * Send bulk messages
   */
  async sendBulkMessages(messages) {
    if (!this.isReady) {
      throw new Error('WhatsApp is not ready. Please authenticate first.');
    }

    const results = [];

    for (const { phoneNumber, message } of messages) {
      try {
        let formattedNumber = phoneNumber.replace(/\D/g, '');
        if (!formattedNumber.startsWith('972')) {
          formattedNumber = '972' + formattedNumber.replace(/^0+/, '');
        }
        const chatId = `${formattedNumber}@c.us`;

        await this.client.sendMessage(chatId, message);
        results.push({ phoneNumber, success: true });
        console.log(`✅ Sent to ${phoneNumber}`);

        // Small delay between messages
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`❌ Failed to send to ${phoneNumber}:`, error.message);

        // Detect frame detachment during bulk send
        if (error.message && error.message.includes('detached Frame')) {
          console.error('🔴 Frame detached during bulk send - client is broken, resetting state');
          this.isReady = false;

          try {
            await this.client.destroy();
          } catch (destroyError) {
            console.error('Error destroying client:', destroyError);
          }

          this.client = null;

          if (this.io) {
            this.io.emit('whatsapp:disconnected', { reason: 'frame_detached' });
          }

          // Stop bulk send immediately and return error with partial results
          const err = new Error('חיבור WhatsApp התנתק. יש להתחבר מחדש דרך ההגדרות');
          err.partialResults = results;
          throw err;
        }

        results.push({ phoneNumber, success: false, error: error.message });
      }
    }

    return results;
  }

  /**
   * Disconnect WhatsApp client
   */
  async disconnect() {
    try {
      if (this.client) {
        await this.client.destroy();
        this.client = null;
        this.isReady = false;
        this.qrCode = null;
        console.log('🔌 WhatsApp disconnected');

        if (this.io) {
          this.io.emit('whatsapp:disconnected', { reason: 'manual' });
        }
      }
    } catch (error) {
      console.error('Error during disconnect:', error);
      throw error;
    }
  }
}

// Create singleton instance
const whatsappService = new WhatsAppService();

module.exports = whatsappService;
