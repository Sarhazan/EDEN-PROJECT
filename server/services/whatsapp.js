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
    this.initializationTimeout = null;
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
    const isProduction = env === 'production';

    console.log(`🚀 Initializing WhatsApp client (${env})...`);
    console.log(`   clientId: ${clientId}`);
    console.log(`   dataPath: ${dataPath}`);
    console.log(`   isProduction: ${isProduction}`);

    // Configure Puppeteer options based on environment
    let puppeteerOptions = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-software-rasterizer',
        '--single-process'
      ]
    };

    // In production (Railway), use @sparticuz/chromium for better compatibility
    if (isProduction) {
      try {
        const chromium = require('@sparticuz/chromium');
        puppeteerOptions.executablePath = await chromium.executablePath();
        puppeteerOptions.args = chromium.args;
        puppeteerOptions.headless = chromium.headless;
        console.log('✓ Using @sparticuz/chromium for production');
      } catch (chromiumError) {
        console.log('⚠ @sparticuz/chromium not available, using default Puppeteer:', chromiumError.message);
      }
    }

    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: clientId,
        dataPath: dataPath
      }),
      puppeteer: puppeteerOptions,
      // Disable automatic "seen" marking to avoid errors
      qrMaxRetries: 5,
      // Use remote web version cache from official wppconnect-team repository
      // This ensures WhatsApp Web version compatibility and prevents ready event issues
      webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1032534684-alpha.html'
      },
      // Increase timeouts for cloud environments
      authTimeoutMs: 120000 // 2 minutes for auth
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

        // Only store and emit if client is still valid (not disconnected during async QR generation)
        if (this.client) {
          this.qrDataUrl = qrDataUrl;

          if (this.io) {
            this.io.emit('whatsapp:qr', { qrDataUrl });
            console.log('✓ QR code emitted to connected clients');
          }
        } else {
          console.log('⚠ QR generated but client already disconnected - discarding');
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
      this.clearInitTimeout(); // Clear timeout since we're ready

      if (this.io) {
        this.io.emit('whatsapp:ready');
      }
    });

    // Authenticated event - QR scanned, initializing session
    this.client.on('authenticated', () => {
      console.log('✅ WhatsApp authenticated successfully');
      this.qrCode = null;
      this.qrDataUrl = null; // Clear QR immediately after scan

      // Set timeout for ready event - if it doesn't fire within 2 minutes, something is wrong
      this.setInitTimeout();

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
      this.clearInitTimeout();

      if (this.io) {
        this.io.emit('whatsapp:disconnected', { reason });
      }
    });

    // Loading screen event - useful for tracking initialization progress
    this.client.on('loading_screen', (percent, message) => {
      console.log(`📊 Loading: ${percent}% - ${message}`);
      if (this.io) {
        this.io.emit('whatsapp:loading', { percent, message });
      }
    });

    // Auth failure event
    this.client.on('auth_failure', (message) => {
      console.error('❌ WhatsApp auth failure:', message);
      this.isReady = false;
      this.clearInitTimeout();

      if (this.io) {
        this.io.emit('whatsapp:auth_failure', { message });
      }
    });

    // Remote session saved event
    this.client.on('remote_session_saved', () => {
      console.log('💾 Remote session saved');
    });

    // State change event - useful for debugging connection issues
    this.client.on('change_state', (state) => {
      console.log(`🔄 WhatsApp state changed: ${state}`);
    });

    // Initialize client
    console.log('⏳ Starting WhatsApp client initialization...');
    console.log('   Using webVersionCache: wppconnect-team/wa-version (2.3000.1032534684-alpha)');
    await this.client.initialize();
  }

  /**
   * Set initialization timeout - ready should fire within 2 minutes of auth
   */
  setInitTimeout() {
    this.clearInitTimeout();
    this.initializationTimeout = setTimeout(() => {
      if (!this.isReady) {
        console.error('⏰ WhatsApp initialization timeout - ready event not received after 2 minutes');
        if (this.io) {
          this.io.emit('whatsapp:init_timeout', {
            message: 'החיבור נתקע. יש לנסות להתנתק ולהתחבר מחדש.'
          });
        }
      }
    }, 120000); // 2 minutes
  }

  /**
   * Clear initialization timeout
   */
  clearInitTimeout() {
    if (this.initializationTimeout) {
      clearTimeout(this.initializationTimeout);
      this.initializationTimeout = null;
    }
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
