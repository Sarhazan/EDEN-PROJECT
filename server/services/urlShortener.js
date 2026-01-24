const axios = require('axios');

/**
 * URL Shortening Service
 * Uses is.gd API - no authentication required, simple and reliable
 * Fallback: returns original URL if shortening fails
 */
class UrlShortenerService {
  constructor() {
    this.apiUrl = 'https://is.gd/create.php';
    this.enabled = process.env.URL_SHORTENER_ENABLED !== 'false'; // Enabled by default
  }

  /**
   * Shorten a URL using is.gd service
   * @param {string} longUrl - The URL to shorten
   * @param {object} options - Optional parameters
   * @param {number} options.timeout - Request timeout in ms (default: 5000)
   * @returns {Promise<string>} - Shortened URL or original URL if shortening fails
   */
  async shorten(longUrl, options = {}) {
    // If shortening is disabled, return original URL
    if (!this.enabled) {
      console.log('URL shortening is disabled, returning original URL');
      return longUrl;
    }

    const timeout = options.timeout || 5000;

    try {
      console.log(`Shortening URL: ${longUrl}`);

      const response = await axios.get(this.apiUrl, {
        params: {
          format: 'json',
          url: longUrl
        },
        timeout
      });

      if (response.data && response.data.shorturl) {
        const shortUrl = response.data.shorturl;
        console.log(`✓ URL shortened successfully: ${shortUrl}`);
        return shortUrl;
      } else {
        console.warn('Unexpected response from is.gd API, returning original URL');
        return longUrl;
      }
    } catch (error) {
      console.error('URL shortening failed:', error.message);
      console.log('Falling back to original URL');
      return longUrl; // Graceful degradation
    }
  }

  /**
   * Shorten multiple URLs in parallel
   * @param {string[]} urls - Array of URLs to shorten
   * @returns {Promise<string[]>} - Array of shortened URLs (or original URLs if shortening fails)
   */
  async shortenBatch(urls) {
    if (!Array.isArray(urls) || urls.length === 0) {
      return [];
    }

    console.log(`Shortening batch of ${urls.length} URLs...`);

    const promises = urls.map(url => this.shorten(url));
    return await Promise.all(promises);
  }

  /**
   * Enable or disable URL shortening
   * @param {boolean} enabled - Whether to enable URL shortening
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    console.log(`URL shortening ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Check if URL shortening is enabled
   * @returns {boolean} - True if enabled
   */
  isEnabled() {
    return this.enabled;
  }
}

// Export singleton instance
module.exports = new UrlShortenerService();
