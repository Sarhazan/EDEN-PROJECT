/**
 * Date utility functions for handling Israel timezone (Asia/Jerusalem)
 */

/**
 * Get current timestamp in Israel timezone
 * @returns {string} ISO string in Israel timezone (e.g., "2026-01-20 14:30:00")
 */
function getCurrentTimestampIsrael() {
  const now = new Date();

  // Convert to Israel timezone (UTC+2 or UTC+3 depending on DST)
  const israelTime = new Date(now.toLocaleString('en-US', {
    timeZone: 'Asia/Jerusalem'
  }));

  // Format as SQL timestamp: YYYY-MM-DD HH:MM:SS
  const year = israelTime.getFullYear();
  const month = String(israelTime.getMonth() + 1).padStart(2, '0');
  const day = String(israelTime.getDate()).padStart(2, '0');
  const hours = String(israelTime.getHours()).padStart(2, '0');
  const minutes = String(israelTime.getMinutes()).padStart(2, '0');
  const seconds = String(israelTime.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

module.exports = {
  getCurrentTimestampIsrael
};
