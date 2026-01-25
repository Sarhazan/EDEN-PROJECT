const axios = require('axios');

/**
 * WhatsApp Service - Gateway Client
 *
 * This service communicates with a local WhatsApp gateway running on your machine.
 * The gateway handles the actual WhatsApp connection using whatsapp-web.js.
 */
class WhatsAppService {
  constructor() {
    // Use environment variable or default to local network
    this.gatewayUrl = process.env.WHATSAPP_GATEWAY_URL || 'http://192.168.1.35:3003';
    console.log(`WhatsApp Gateway URL: ${this.gatewayUrl}`);
  }

  /**
   * Check if gateway is reachable and WhatsApp is ready
   */
  async getStatus() {
    try {
      const response = await axios.get(`${this.gatewayUrl}/status`, {
        timeout: 5000,
        headers: { 'bypass-tunnel-reminder': 'true' }
      });
      return {
        isReady: response.data.isReady,
        needsAuth: response.data.hasQR,
        isInitialized: response.data.isInitialized
      };
    } catch (error) {
      console.error('Gateway not reachable:', error.message);
      return {
        isReady: false,
        needsAuth: false,
        isInitialized: false,
        error: 'Gateway not reachable - make sure WhatsApp gateway is running on your computer'
      };
    }
  }

  /**
   * Get QR code from gateway (for initial authentication)
   */
  async getQRCode() {
    try {
      const response = await axios.get(`${this.gatewayUrl}/qr`, {
        timeout: 10000,
        headers: { 'bypass-tunnel-reminder': 'true' }
      });

      if (response.data.qrCode) {
        return response.data.qrCode;
      } else if (response.data.message) {
        console.log(response.data.message);
        return null;
      }
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log('QR code not available yet - gateway is initializing');
        return null;
      }
      console.error('Error getting QR code:', error.message);
      throw new Error('לא ניתן להתחבר לשרת WhatsApp המקומי');
    }
  }

  /**
   * Send WhatsApp message via gateway
   */
  async sendMessage(phoneNumber, message) {
    try {
      console.log(`Sending message to ${phoneNumber} via gateway...`);

      const response = await axios.post(
        `${this.gatewayUrl}/send`,
        { phoneNumber, message },
        {
          timeout: 30000,
          headers: { 'bypass-tunnel-reminder': 'true' }
        }
      );

      if (response.data.success) {
        console.log('✓ Message sent successfully via gateway');
        return { success: true };
      } else {
        throw new Error('Gateway returned non-success response');
      }
    } catch (error) {
      console.error('Error sending message via gateway:', error.message);

      if (error.response) {
        throw new Error(error.response.data.error || 'שגיאה בשליחת הודעה');
      } else if (error.code === 'ECONNREFUSED') {
        throw new Error('שרת WhatsApp המקומי אינו זמין - וודא שהשרת רץ על המחשב שלך');
      } else {
        throw new Error('שגיאה בחיבור לשרת WhatsApp');
      }
    }
  }

  /**
   * Send bulk messages via gateway
   */
  async sendBulkMessages(messages) {
    try {
      console.log(`Sending ${messages.length} messages via gateway...`);

      const response = await axios.post(
        `${this.gatewayUrl}/send-bulk`,
        { messages },
        {
          timeout: 120000, // 2 minutes for bulk
          headers: { 'bypass-tunnel-reminder': 'true' }
        }
      );

      if (response.data.success) {
        console.log('✓ Bulk send completed');
        return response.data.results;
      } else {
        throw new Error('Gateway returned non-success response');
      }
    } catch (error) {
      console.error('Error in bulk send via gateway:', error.message);
      throw error;
    }
  }

  /**
   * Disconnect (not really needed with gateway, but kept for API compatibility)
   */
  async disconnect() {
    try {
      await axios.post(`${this.gatewayUrl}/disconnect`, {}, {
        headers: { 'bypass-tunnel-reminder': 'true' }
      });
      console.log('Gateway disconnected');
    } catch (error) {
      console.error('Error disconnecting gateway:', error.message);
    }
  }

  /**
   * Initialize - for gateway, this just checks status
   */
  async initialize() {
    console.log('Checking WhatsApp gateway status...');
    const status = await this.getStatus();
    console.log('Gateway status:', status);
  }
}

// Create singleton instance
const whatsappService = new WhatsAppService();

module.exports = whatsappService;
