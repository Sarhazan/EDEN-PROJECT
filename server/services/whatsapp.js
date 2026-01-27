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
    this.qrDataUrl = null; // Store the latest QR data URL
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
    // Use environment-specific clientId and dataPath to separate production from dev
    const env = process.env.NODE_ENV || 'development';
    const clientId = `eden-whatsapp-${env}`;
    const dataPath = `./.wwebjs_auth_${env}`;

    console.log(`🚀 Initializing WhatsApp client (${env})...`);
    console.log(`   clientId: ${clientId}`);
    console.log(`   dataPath: ${dataPath}`);

    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: clientId,
        dataPath: dataPath
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      },
      // Disable automatic "seen" marking to avoid errors
      qrMaxRetries: 5
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

        // Store the latest QR data URL
        this.qrDataUrl = qrDataUrl;

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
      this.qrDataUrl = null; // Clear QR data URL when connected

      if (this.io) {
        this.io.emit('whatsapp:ready');
      }
    });

    // Authenticated event - QR scanned, initializing session
    this.client.on('authenticated', () => {
      console.log('✅ WhatsApp authenticated successfully');
      this.qrCode = null;
      this.qrDataUrl = null; // Clear QR immediately after scan

      if (this.io) {
        this.io.emit('whatsapp:authenticated');
      }
    });

    // Disconnected event
    this.client.on('disconnected', (reason) => {
      console.log('❌ WhatsApp disconnected:', reason);
      this.isReady = false;
      this.client = null;
      this.qrCode = null;
      this.qrDataUrl = null; // Clear QR data so new clients don't get stale QR

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

      // Verify the number is registered on WhatsApp
      console.log('Checking if number is registered on WhatsApp...');
      const isRegistered = await this.client.isRegisteredUser(chatId);

      if (!isRegistered) {
        console.error(`❌ Number ${formattedNumber} is not registered on WhatsApp`);
        throw new Error(`המספר ${phoneNumber} לא רשום ב-WhatsApp`);
      }

      console.log('✓ Number is registered, proceeding with send');

      // Send message with sendSeen disabled to avoid WhatsApp Web API issues
      console.log('Sending message with sendSeen=false...');
      await this.client.sendMessage(chatId, message, {
        sendSeen: false
      });

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

        await this.client.sendMessage(chatId, message, { sendSeen: false });
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
   * Disconnect WhatsApp client (full logout - clears session for fresh connection)
   */
  async disconnect() {
    try {
      if (this.client) {
        console.log('🔌 Logging out and disconnecting WhatsApp...');

        // Use logout() to properly disconnect from the phone and clear session
        // This allows a fresh QR scan on next connect
        try {
          await this.client.logout();
          console.log('✓ Logged out from WhatsApp (phone disconnected)');
        } catch (logoutError) {
          // If logout fails (e.g., not connected), just destroy
          console.log('Logout not possible, destroying client:', logoutError.message);
          await this.client.destroy();
        }

        this.client = null;
        this.isReady = false;
        this.qrCode = null;
        this.qrDataUrl = null;
        console.log('🔌 WhatsApp fully disconnected');

        if (this.io) {
          this.io.emit('whatsapp:disconnected', { reason: 'manual' });
        }
      }
    } catch (error) {
      console.error('Error during disconnect:', error);
      // Even on error, clear our state
      this.client = null;
      this.isReady = false;
      this.qrCode = null;
      this.qrDataUrl = null;
      throw error;
    }
  }
}

// Create singleton instance
const whatsappService = new WhatsAppService();

module.exports = whatsappService;
