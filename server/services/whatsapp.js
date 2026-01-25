const { Client, RemoteAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const chromium = require('@sparticuz/chromium');
const { MongoStore } = require('wwebjs-mongo');
const mongoose = require('mongoose');

class WhatsAppService {
  constructor() {
    this.client = null;
    this.isReady = false;
    this.qrCode = null;
    this.qrCodeCallbacks = [];
    this.store = null;
  }

  async initialize() {
    console.log('=== WhatsAppService.initialize() called ===');

    // Check if client already exists and is ready
    if (this.client && this.isReady) {
      console.log('Client already initialized and ready - reusing existing session');
      return;
    }

    // If client exists but not ready, destroy it
    if (this.client && !this.isReady) {
      console.log('Client exists but not ready - destroying and recreating...');
      try {
        await this.client.destroy();
      } catch (error) {
        console.error('Error destroying old client:', error);
      }
      this.client = null;
      this.isReady = false;
      this.qrCode = null;
    }

    console.log('Creating new WhatsApp client with RemoteAuth (MongoDB)...');

    try {
      // Initialize MongoDB store for session persistence
      const mongoUrl = process.env.MONGODB_URI;

      if (!mongoUrl) {
        throw new Error('MONGODB_URI environment variable is not set');
      }

      console.log('Connecting to MongoDB for session storage...');

      // Connect to MongoDB
      await mongoose.connect(mongoUrl);

      // Create MongoDB store for WhatsApp sessions
      this.store = new MongoStore({ mongoose: mongoose });

      console.log('✓ MongoDB connected successfully');

      // Create WhatsApp client with authentication storage
      const puppeteerConfig = {
        headless: chromium.headless,
        args: chromium.args,
        executablePath: await chromium.executablePath()
      };

      console.log('Using Chromium from @sparticuz/chromium package');

      this.client = new Client({
        authStrategy: new RemoteAuth({
          store: this.store,
          backupSyncIntervalMs: 300000 // Backup every 5 minutes
        }),
        puppeteer: puppeteerConfig
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

      // Authenticated event - also set ready here as fallback
      // (NoAuth strategy may not fire 'ready' event reliably - known library issue)
      this.client.on('authenticated', () => {
        console.log('✓ WhatsApp client authenticated');

        // Wait a bit to ensure client is fully initialized before marking ready
        // This is a workaround for NoAuth ready event not firing (library bug)
        setTimeout(() => {
          if (!this.isReady) { // Only set if ready event hasn't fired yet
            console.log('  Setting isReady=true (fallback - ready event did not fire)');
            this.isReady = true;
            this.qrCode = null;
          } else {
            console.log('  ready event already fired, skipping fallback');
          }
        }, 5000); // Wait 5 seconds for ready event, then fallback
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

      // Loading screen event - use this to detect when authentication completes
      this.client.on('loading_screen', (percent, message) => {
        console.log(`Loading: ${percent}% - ${message}`);

        // RemoteAuth may not fire 'ready' event reliably - use loading_screen as fallback
        if (percent >= 99 && !this.isReady) {
          console.log('⚠ Loading reached 99% but ready event has not fired yet');
          console.log('  Will wait 8 seconds then check if we should mark as ready...');

          setTimeout(() => {
            // Only mark ready if:
            // 1. Still not ready (ready event didn't fire)
            // 2. Client still exists
            // 3. Loading reached high percentage
            if (!this.isReady && this.client) {
              console.log('✓ Setting isReady=true after loading_screen 99% (fallback mechanism)');
              this.isReady = true;
              this.qrCode = null;
            } else if (this.isReady) {
              console.log('  ready event fired in the meantime - no action needed');
            }
          }, 8000); // Wait 8 seconds for ready event
        }
      });

      // RemoteAuth events - track session storage
      this.client.on('remote_session_saved', () => {
        console.log('✓ WhatsApp session saved to MongoDB successfully');
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

      // If detached frame error, mark client as broken and require reconnection
      if (error.message && error.message.includes('detached Frame')) {
        console.error('⚠ CRITICAL: Puppeteer frame detached - client is now unusable');
        console.error('   Marking client as not ready and destroying...');

        // Mark as not ready to prevent further send attempts
        this.isReady = false;

        // Destroy the broken client
        try {
          if (this.client) {
            await this.client.destroy();
            this.client = null;
          }
        } catch (destroyError) {
          console.error('Error destroying broken client:', destroyError);
        }

        throw new Error('חיבור WhatsApp התנתק. יש להתחבר מחדש דרך ההגדרות.');
      }

      // If still getting markedUnread error, try alternative method
      if (error.message && error.message.includes('markedUnread')) {
        console.log('⚠ Retrying with alternative method...');

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

          // Check if retry also had frame detachment
          if (retryError.message && retryError.message.includes('detached Frame')) {
            console.error('⚠ CRITICAL: Frame detached during retry - destroying client');
            this.isReady = false;
            try {
              if (this.client) {
                await this.client.destroy();
                this.client = null;
              }
            } catch (destroyError) {
              console.error('Error destroying broken client:', destroyError);
            }
            throw new Error('חיבור WhatsApp התנתק. יש להתחבר מחדש דרך ההגדרות.');
          }

          throw new Error(`שגיאה בשליחת הודעת וואטסאפ: ${retryError.message}`);
        }
      }

      throw new Error(`שגיאה בשליחת הודעת וואטסאפ: ${error.message}`);
    }
  }

  // Disconnect (destroy session)
  async disconnect() {
    if (this.client) {
      console.log('Disconnecting WhatsApp client...');
      try {
        await this.client.destroy();
      } catch (error) {
        console.error('Error destroying client:', error);
      }
      this.client = null;
      this.isReady = false;
      this.qrCode = null;
      console.log('WhatsApp client disconnected');
    }
  }
}

// Create singleton instance
const whatsappService = new WhatsAppService();

module.exports = whatsappService;
