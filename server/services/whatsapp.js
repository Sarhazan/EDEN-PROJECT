const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Normalize a phone number to WhatsApp format (digits only, with country code).
 * Supports international numbers (+91, +1, etc.) and Israeli local numbers.
 */
function normalizePhone(phoneNumber) {
  const raw = String(phoneNumber || '').trim();
  // Has explicit + country code: +972..., +91..., +1...
  if (raw.startsWith('+')) return raw.replace(/\D/g, '');
  // Has 00 international prefix
  if (raw.startsWith('00')) return raw.replace(/\D/g, '').replace(/^00/, '');
  const digits = raw.replace(/\D/g, '');
  // Already has a country code (more than 10 digits, starts with non-zero)
  if (digits.length > 10 && !digits.startsWith('0')) return digits;
  // Israeli local: starts with 0 (e.g. 0501234567)
  if (digits.startsWith('0')) return '972' + digits.slice(1);
  // Israeli without leading 0 (e.g. 501234567)
  return '972' + digits;
}

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
    this.readyPollingInterval = null;
    this.knownContactChatIds = new Map(); // normalizedDigits -> chatId
    this.reinitTimer = null;
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

    // In development, clean up stale Puppeteer Chrome locks before initializing
    if (!isProduction) {
      this._cleanupStalePuppeteer(dataPath, clientId);
    }

    // Configure Puppeteer options based on environment
    let puppeteerOptions = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-software-rasterizer'
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
      // Keep QR alive longer on cloud (Railway cold starts / slower scan flows)
      qrMaxRetries: 15,
      takeoverOnConflict: true,
      takeoverTimeoutMs: 0,
      // Disable web version cache - let whatsapp-web.js fetch directly from WhatsApp
      // This avoids version mismatch issues that can prevent the ready event
      webVersionCache: {
        type: 'none'
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

      // Clear polling if active
      if (this.readyPollingInterval) {
        clearInterval(this.readyPollingInterval);
        this.readyPollingInterval = null;
      }

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

      // WORKAROUND: Poll for ready state since ready event sometimes doesn't fire
      // This is a known issue with whatsapp-web.js in cloud environments
      this.startReadyPolling();

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

      const reasonText = String(reason || '').toLowerCase();
      if (reasonText.includes('max qrcode retries reached') || reasonText.includes('navigation') || reasonText.includes('protocol error')) {
        this.scheduleReinitialize(5000, reasonText || 'disconnected');
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

      this.client = null;
      this.scheduleReinitialize(7000, 'auth_failure');
    });

    // Remote session saved event
    this.client.on('remote_session_saved', () => {
      console.log('💾 Remote session saved');
    });

    // State change event - useful for debugging connection issues
    this.client.on('change_state', (state) => {
      console.log(`🔄 WhatsApp state changed: ${state}`);
    });

    // Cache incoming chat IDs so we can send back without LID lookup issues
    this.client.on('message', (msg) => {
      try {
        const from = String(msg?.from || '');
        if (!from.endsWith('@c.us') && !from.endsWith('@lid')) return;

        const digits = from.replace(/\D/g, '');
        if (!digits) return;

        // Keep last 9+ digits mapping (Israeli local + intl forms)
        const local = digits.replace(/^972/, '');
        if (local) this.knownContactChatIds.set(local, from);
        this.knownContactChatIds.set(digits, from);
      } catch (e) {
        // ignore cache errors
      }
    });

    // Initialize client
    console.log('⏳ Starting WhatsApp client initialization...');
    console.log('   webVersionCache: disabled (type: none)');
    await this.client.initialize();
  }

  /**
   * Development-only: kill stale Puppeteer Chrome processes and remove SingletonLock.
   * Strategy: read PID from chrome.pid file first (fast + precise),
   * fallback to wmic scan if pid file missing.
   */
  _cleanupStalePuppeteer(dataPath, clientId) {
    const pidFile = path.join(dataPath, 'chrome.pid');

    // 1. Kill by saved PID (precise, fast)
    try {
      if (fs.existsSync(pidFile)) {
        const pid = parseInt(fs.readFileSync(pidFile, 'utf8').trim(), 10);
        if (pid && !isNaN(pid)) {
          try {
            if (process.platform === 'win32') {
              execSync(`taskkill /PID ${pid} /T /F 2>nul`, { timeout: 5000 });
            } else {
              process.kill(pid, 'SIGKILL');
            }
            console.log(`🧹 Killed stale Puppeteer Chrome (PID ${pid})`);
          } catch (_) {
            // Process already dead — that's fine
          }
        }
        fs.unlinkSync(pidFile);
      }
    } catch (e) {
      // Non-critical
    }

    // 2. Remove SingletonLock
    try {
      const lockFile = path.join(dataPath, `session-${clientId}`, 'SingletonLock');
      if (fs.existsSync(lockFile)) {
        fs.unlinkSync(lockFile);
        console.log('🧹 Removed stale Puppeteer SingletonLock');
      }
    } catch (e) {
      console.log('⚠ Could not remove SingletonLock:', e.message);
    }

    // 3. Fallback: wmic scan (catches orphans if pid file was missing)
    try {
      if (process.platform === 'win32') {
        const result = execSync(
          `wmic process where "name='chrome.exe'" get ProcessId,CommandLine /format:csv 2>nul`,
          { encoding: 'utf8', timeout: 5000 }
        );
        let killed = 0;
        for (const line of result.split('\n')) {
          if (line.includes('wwebjs') || line.includes('puppeteer')) {
            const match = line.match(/,(\d+)\s*$/);
            if (match) {
              try { execSync(`taskkill /PID ${match[1]} /F 2>nul`, { timeout: 3000 }); killed++; } catch (_) {}
            }
          }
        }
        if (killed > 0) console.log(`🧹 Killed ${killed} orphan Puppeteer Chrome process(es) via wmic`);
      }
    } catch (e) {
      // Non-critical
    }
  }

  /**
   * Save Puppeteer Chrome PID to file so next restart can kill it precisely.
   * Call after client.initialize() succeeds and browser is launched.
   */
  _saveChromePid(dataPath) {
    try {
      const browser = this.client?.pupBrowser || this.client?._pupBrowser || this.client?.browser;
      const proc = browser?.process ? browser.process() : null;
      if (proc?.pid) {
        fs.writeFileSync(path.join(dataPath, 'chrome.pid'), String(proc.pid));
        console.log(`💾 Saved Chrome PID ${proc.pid}`);
      }
    } catch (e) {
      // Non-critical
    }
  }

  scheduleReinitialize(delayMs = 4000, reason = 'unknown') {
    if (this.reinitTimer) {
      clearTimeout(this.reinitTimer);
      this.reinitTimer = null;
    }

    console.log(`🔁 Scheduling WhatsApp reinitialize in ${delayMs}ms (reason: ${reason})`);
    this.reinitTimer = setTimeout(async () => {
      this.reinitTimer = null;
      try {
        if (!this.client) {
          await this.initialize();
        }
      } catch (e) {
        console.error('❌ Reinitialize failed:', e?.message || e);
      }
    }, delayMs);
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
   * WORKAROUND: Poll for ready state after authentication
   * The ready event sometimes doesn't fire in cloud environments
   * This polls the client to check if it's actually ready
   */
  startReadyPolling() {
    if (this.readyPollingInterval) {
      clearInterval(this.readyPollingInterval);
    }

    let attempts = 0;
    const maxAttempts = 30; // 30 attempts * 5 seconds = 2.5 minutes max

    console.log('🔄 Starting ready state polling (workaround for ready event not firing)');

    this.readyPollingInterval = setInterval(async () => {
      attempts++;

      if (this.isReady) {
        // Ready event fired normally, stop polling
        console.log('✓ Ready event fired, stopping polling');
        clearInterval(this.readyPollingInterval);
        this.readyPollingInterval = null;
        return;
      }

      if (!this.client) {
        // Client was destroyed, stop polling
        console.log('⚠ Client destroyed, stopping polling');
        clearInterval(this.readyPollingInterval);
        this.readyPollingInterval = null;
        return;
      }

      if (attempts > maxAttempts) {
        console.log('⏰ Ready polling timeout after', maxAttempts, 'attempts');
        clearInterval(this.readyPollingInterval);
        this.readyPollingInterval = null;
        return;
      }

      try {
        // Try to get client info - if this succeeds, the client is actually ready
        console.log(`🔍 Polling attempt ${attempts}/${maxAttempts} - checking if client is ready...`);
        const info = await this.client.getState();
        console.log(`   Client state: ${info}`);

        if (info === 'CONNECTED') {
          console.log('✅ Client is CONNECTED! Manually triggering ready state...');
          this.isReady = true;
          this.qrCode = null;
          this.qrDataUrl = null;
          this.clearInitTimeout();

          if (this.io) {
            this.io.emit('whatsapp:ready');
          }

          clearInterval(this.readyPollingInterval);
          this.readyPollingInterval = null;
        }
      } catch (error) {
        console.log(`   Polling check failed: ${error.message}`);
      }
    }, 5000); // Check every 5 seconds
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

  getQrDataUrl() {
    return this.qrDataUrl || null;
  }

  /**
   * Send WhatsApp message
   */
  async sendMessage(phoneNumber, message, timeoutMs = 60000) {
    // Wrap entire send in a timeout to prevent UI from getting stuck indefinitely
    // Use 60s default — first send after fresh auth can be slow (browser session warm-up)
    return Promise.race([
      this._sendMessageInternal(phoneNumber, message),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('שליחת WhatsApp נכשלה (timeout) — נסה שנית')), timeoutMs)
      )
    ]);
  }

  async sendFile(phoneNumber, filePath, caption = '', timeoutMs = 60000) {
    return Promise.race([
      this._sendFileInternal(phoneNumber, filePath, caption),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('שליחת קובץ נכשלה (timeout)')), timeoutMs)
      )
    ]);
  }

  async _sendFileInternal(phoneNumber, filePath, caption) {
    if (!this.isReady) throw new Error('WhatsApp is not ready');
    const media = MessageMedia.fromFilePath(filePath);
    const formattedNumber = normalizePhone(phoneNumber);
    const localDigits = formattedNumber.slice(-9);
    const chatId = this.knownContactChatIds.get(localDigits)
      || this.knownContactChatIds.get(formattedNumber)
      || `${formattedNumber}@c.us`;
    await this.client.sendMessage(chatId, media, { caption, sendSeen: false });
    console.log(`📎 File sent to ${chatId}: ${filePath}`);
  }

  async _sendMessageInternal(phoneNumber, message) {
    try {
      if (!this.isReady) {
        throw new Error('WhatsApp is not ready. Please authenticate first.');
      }

      // Format phone number for WhatsApp (international support)
      let formattedNumber = normalizePhone(phoneNumber);

      const localDigits = formattedNumber.slice(-9); // last 9 digits for lookup
      let chatId = this.knownContactChatIds.get(localDigits)
        || this.knownContactChatIds.get(formattedNumber)
        || `${formattedNumber}@c.us`;

      console.log(`📤 Sending message to ${chatId}...`);

      // Verify number using multiple strategies (some WA sessions return false negatives on isRegisteredUser)
      console.log('Checking if number is registered on WhatsApp...');
      let isRegistered = chatId.endsWith('@lid');
      try {
        if (!isRegistered) {
          isRegistered = await this.client.isRegisteredUser(chatId);
        }
      } catch (checkError) {
        console.warn('isRegisteredUser check failed, continuing with fallback:', checkError.message);
      }

      if (!isRegistered) {
        try {
          const numberInfo = await this.client.getNumberId(formattedNumber);
          if (numberInfo && numberInfo._serialized) {
            chatId = numberInfo._serialized;
            isRegistered = true;
            console.log(`✓ getNumberId resolved chatId: ${chatId}`);
          }
        } catch (fallbackError) {
          console.warn('getNumberId fallback failed:', fallbackError.message);
        }
      }

      if (!isRegistered) {
        console.warn(`⚠ Could not verify registration for ${formattedNumber}; attempting send anyway`);
      } else {
        console.log('✓ Number is registered, proceeding with send');
      }

      // Send message with sendSeen disabled to avoid WhatsApp Web API issues
      console.log('Sending message with sendSeen=false...');
      try {
        await this.client.sendMessage(chatId, message, {
          sendSeen: false
        });
      } catch (primarySendError) {
        const msg = primarySendError?.message || '';
        const isLidError = msg.includes('No LID for user');

        if (!isLidError) {
          throw primarySendError;
        }

        console.warn('Primary send failed with LID error, trying LID resolution fallback...');

        let fallbackChatId = null;
        try {
          const cUsId = `${formattedNumber}@c.us`;
          const lidInfo = await this.client.getContactLidAndPhone([cUsId]);
          fallbackChatId = lidInfo?.[0]?.lid || null;
          console.log('LID lookup result:', fallbackChatId || 'none');
        } catch (lidLookupError) {
          console.warn('LID lookup failed:', lidLookupError.message);
        }

        if (!fallbackChatId) {
          // Second fallback: try existing chats and send via an already known chat id
          try {
            const chats = await this.client.getChats();
            const localDigits = phoneNumber.replace(/\D/g, '').replace(/^0+/, '');
            const candidate = chats.find((chat) => {
              const serialized = String(chat?.id?._serialized || '');
              const user = String(chat?.id?.user || '');
              return serialized.includes(localDigits) || user.includes(localDigits);
            });

            if (candidate?.id?._serialized) {
              fallbackChatId = candidate.id._serialized;
              console.log(`✓ Existing chat fallback resolved chatId: ${fallbackChatId}`);
            }
          } catch (chatFallbackError) {
            console.warn('Existing chat fallback failed:', chatFallbackError.message);
          }
        }

        if (!fallbackChatId) {
          throw primarySendError;
        }

        await this.client.sendMessage(fallbackChatId, message, {
          sendSeen: false
        });
      }

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
        // DEV MODE SAFEGUARD
        if (process.env.NODE_ENV !== 'production' && process.env.DEV_ONLY_PHONE) {
          const normalize = (p) => p.replace(/\D/g, '').replace(/^972/, '').replace(/^0+/, '');
          if (normalize(phoneNumber) !== normalize(process.env.DEV_ONLY_PHONE)) {
            console.warn('[DEV BLOCKED] Bulk message to ' + phoneNumber + ' blocked');
            results.push({ phoneNumber, success: true, blocked: true });
            continue;
          }
        }
        const formattedNumber = normalizePhone(phoneNumber);
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
