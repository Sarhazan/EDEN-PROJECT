/**
 * apiError.js — Centralised API error handling for EDEN client
 *
 * Handles the three ways a server error can arrive:
 *   1. Axios HTTP error  → err.response.data.error  (our API format)
 *   2. Axios network err → err.message              (no response)
 *   3. Plain JS Error    → err.message
 */

/** Default toast options used everywhere — keeps appearance consistent */
export const TOAST_DEFAULTS = {
  position: 'bottom-center',
  autoClose: 3500,
  rtl: true,
  hideProgressBar: false,
};

/**
 * Extract a human-readable error string from any thrown value.
 * @param {any} err
 * @param {string} [fallback] — shown when we can't find a message
 * @returns {string}
 */
export function extractError(err, fallback = 'אירעה שגיאה') {
  if (!err) return fallback;

  // Axios response error (server returned JSON)
  if (err?.response?.data) {
    const d = err.response.data;
    return d.error || d.message || d.detail || fallback;
  }

  // Axios network/timeout error or plain Error
  if (err?.message) return err.message;

  // String thrown directly
  if (typeof err === 'string') return err;

  return fallback;
}

/**
 * Show a toast for an API error using consistent options.
 * @param {function} toastFn — the `toast` object from react-toastify
 * @param {any} err
 * @param {string} [fallback]
 */
export function toastApiError(toastFn, err, fallback = 'אירעה שגיאה') {
  const message = extractError(err, fallback);
  toastFn.error(message, TOAST_DEFAULTS);
}

/**
 * Convenience: returns true if the error is an HTTP 4xx client error.
 */
export function isClientError(err) {
  const status = err?.response?.status;
  return status >= 400 && status < 500;
}
