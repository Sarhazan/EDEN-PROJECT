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
    console.log('=== WhatsAppService.initialize() called ===');

    if (this.client) {
      console.log('WhatsApp client already initialized');
      return;
    }

    console.log('Creating new WhatsApp client...');
    const authPath = path.join(__dirname, '..', '.wwebjs_auth');
    console.log('Auth data path:', authPath);

    try {
      // Create WhatsApp client with local authentication
      this.client = new Client({
        authStrategy: new LocalAuth({
          dataPath: authPath
        }),
        puppeteer: {
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
      });
      console.log('Client object created successfully');

      // QR Code event - for initial authentication
      this.client.on('qr', (qr) => {
        console.log('✓ QR Code event fired - QR received!');
        this.qrCode = qr;
        this.isReady = false;

        // Generate QR in terminal for debugging
        console.log('Displaying QR in terminal:');
        qrcode.generate(qr, { small: true });

        // Notify all waiting callbacks
        console.log(`Notifying ${this.qrCodeCallbacks.length} waiting callbacks`);
        this.qrCodeCallbacks.forEach(callback => callback(qr));
        this.qrCodeCallbacks = [];
      });

      // Ready event - client is authenticated and ready
      this.client.on('ready', () => {
        console.log('✓ WhatsApp client is ready');
        this.isReady = true;
        this.qrCode = null;
      });

      // Authenticated event
      this.client.on('authenticated', () => {
        console.log('✓ WhatsApp client authenticated');
      });

      // Authentication failure event
      this.client.on('auth_failure', (msg) => {
        console.error('✗ WhatsApp authentication failed:', msg);
        this.isReady = false;
      });

      // Disconnected event
      this.client.on('disconnected', (reason) => {
        console.log('✗ WhatsApp client disconnected:', reason);
        this.isReady = false;
        this.client.destroy();
        this.client = null;
      });

      // Loading screen event
      this.client.on('loading_screen', (percent, message) => {
        console.log(`Loading: ${percent}% - ${message}`);
      });

      // Initialize the client
      console.log('Calling client.initialize()...');
      this.client.initialize();
      console.log('client.initialize() called successfully');
    } catch (error) {
      console.error('✗ Error during client initialization:', error);
      throw error;
    }
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

    // Wait a bit to ensure frame is attached after navigation
    await new Promise(resolve => setTimeout(resolve, 500));

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
      // Send the message with options to avoid markedUnread issue
      const result = await this.client.sendMessage(chatId, message, {
        sendSeen: false // Don't try to mark as read/unread
      });

      // Validate that we got a result back
      if (!result) {
        throw new Error('WhatsApp sendMessage returned no result');
      }

      console.log('✓ Message sent successfully to', chatId);
      return { success: true };
    } catch (error) {
      console.error('✗ Error sending WhatsApp message:', error);

      // Check if error is because number is not registered
      if (error.message && error.message.includes('phone number is not registered')) {
        throw new Error('מספר הטלפון אינו רשום בוואטסאפ');
      }

      // If still getting markedUnread error OR detached frame, try alternative method
      if (error.message && (error.message.includes('markedUnread') || error.message.includes('detached Frame'))) {
        console.log('⚠ Retrying with alternative method...');
        // Wait a bit longer if it's a detached frame issue
        if (error.message.includes('detached Frame')) {
          console.log('   Waiting for frame to reattach...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        try {
          // Try a more basic send
          const chat = await this.client.getChatById(chatId);
          const retryResult = await chat.sendMessage(message);

          // Validate retry result
          if (!retryResult) {
            throw new Error('Retry sendMessage returned no result');
          }

          console.log('✓ Message sent successfully on retry to', chatId);
          return { success: true };
        } catch (retryError) {
          console.error('✗ Retry also failed:', retryError);
          throw new Error(`שגיאה בשליחת הודעת וואטסאפ: ${retryError.message}`);
        }
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
