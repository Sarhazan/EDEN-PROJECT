const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const path = require('path');

class WhatsAppService {
  constructor() {
    this.client = null;
    this.isReady = false;
    this.qrCode = null;
    this.qrCodeCallbacks = [];
  }

  initialize() {
    if (this.client) {
      console.log('WhatsApp client already initialized');
      return;
    }

    // Create WhatsApp client with local authentication
    this.client = new Client({
      authStrategy: new LocalAuth({
        dataPath: path.join(__dirname, '..', '.wwebjs_auth')
      }),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      }
    });

    // QR Code event - for initial authentication
    this.client.on('qr', (qr) => {
      console.log('QR Code received');
      this.qrCode = qr;
      this.isReady = false;

      // Generate QR in terminal for debugging
      qrcode.generate(qr, { small: true });

      // Notify all waiting callbacks
      this.qrCodeCallbacks.forEach(callback => callback(qr));
      this.qrCodeCallbacks = [];
    });

    // Ready event - client is authenticated and ready
    this.client.on('ready', () => {
      console.log('WhatsApp client is ready');
      this.isReady = true;
      this.qrCode = null;
    });

    // Authenticated event
    this.client.on('authenticated', () => {
      console.log('WhatsApp client authenticated');
    });

    // Authentication failure event
    this.client.on('auth_failure', (msg) => {
      console.error('WhatsApp authentication failed:', msg);
      this.isReady = false;
    });

    // Disconnected event
    this.client.on('disconnected', (reason) => {
      console.log('WhatsApp client disconnected:', reason);
      this.isReady = false;
      this.client.destroy();
      this.client = null;
    });

    // Initialize the client
    this.client.initialize();
  }

  // Get current connection status
  getStatus() {
    return {
      isReady: this.isReady,
      needsAuth: !this.isReady && this.client !== null,
      isInitialized: this.client !== null
    };
  }

  // Get QR code for authentication (returns promise)
  async getQRCode() {
    if (this.isReady) {
      return null; // Already authenticated
    }

    if (this.qrCode) {
      return this.qrCode; // QR code already generated
    }

    // Wait for QR code to be generated
    return new Promise((resolve) => {
      this.qrCodeCallbacks.push(resolve);

      // If client is not initialized, initialize it
      if (!this.client) {
        this.initialize();
      }

      // Timeout after 30 seconds
      setTimeout(() => {
        const index = this.qrCodeCallbacks.indexOf(resolve);
        if (index > -1) {
          this.qrCodeCallbacks.splice(index, 1);
        }
        resolve(null);
      }, 30000);
    });
  }

  // Send WhatsApp message
  async sendMessage(phoneNumber, message) {
    if (!this.isReady) {
      throw new Error('WhatsApp client is not ready. Please authenticate first.');
    }

    // Format phone number for WhatsApp (remove spaces, dashes, etc.)
    let formattedNumber = phoneNumber.replace(/\D/g, '');

    // If number doesn't start with country code, assume Israel (+972)
    if (!formattedNumber.startsWith('972')) {
      // Remove leading 0 if exists and add 972
      formattedNumber = '972' + formattedNumber.replace(/^0+/, '');
    }

    // WhatsApp ID format: phone@c.us
    const chatId = `${formattedNumber}@c.us`;

    try {
      // Send the message directly without checking if registered
      // The sendMessage will fail if number is not registered
      await this.client.sendMessage(chatId, message);

      return { success: true };
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);

      // Check if error is because number is not registered
      if (error.message && error.message.includes('phone number is not registered')) {
        throw new Error('מספר הטלפון אינו רשום בוואטסאפ');
      }

      throw new Error(`שגיאה בשליחת הודעת וואטסאפ: ${error.message}`);
    }
  }

  // Disconnect and logout
  async disconnect() {
    if (this.client) {
      await this.client.logout();
      await this.client.destroy();
      this.client = null;
      this.isReady = false;
      this.qrCode = null;
    }
  }
}

// Create singleton instance
const whatsappService = new WhatsAppService();

module.exports = whatsappService;
