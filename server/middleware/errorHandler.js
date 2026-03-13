/**
 * errorHandler.js — Global Express error middleware for EDEN
 *
 * All unhandled errors bubble up here and are returned as:
 *   { success: false, error: <human-readable message>, code: <string> }
 *
 * Usage: app.use(errorHandler) — must be the LAST middleware in index.js
 */

const ERROR_CODES = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'VALIDATION_ERROR',
  500: 'INTERNAL_ERROR',
};

/**
 * Normalised error response helper — use in routes for manual errors:
 *   return sendError(res, 404, 'המשימה לא נמצאה');
 */
function sendError(res, status, message, code) {
  return res.status(status).json({
    success: false,
    error: message,
    code: code || ERROR_CODES[status] || 'ERROR',
  });
}

/**
 * Normalised success response helper:
 *   return sendOk(res, data);            // 200
 *   return sendOk(res, data, 201);       // 201
 */
function sendOk(res, data, status = 200) {
  return res.status(status).json(data);
}

/**
 * Express error middleware (4-arg signature required by Express).
 * Catches any error passed via next(err) or thrown inside async route
 * wrappers that use asyncHandler().
 */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const status = err.status || err.statusCode || 500;
  const message =
    err.expose !== false && err.message
      ? err.message
      : 'אירעה שגיאה בשרת';

  console.error(`[ErrorHandler] ${req.method} ${req.path} → ${status}:`, err.message);
  if (status >= 500) console.error(err.stack);

  return res.status(status).json({
    success: false,
    error: message,
    code: ERROR_CODES[status] || 'ERROR',
  });
}

/**
 * Wrap async route handlers so thrown errors reach errorHandler automatically.
 * Usage: router.get('/path', asyncHandler(async (req, res) => { ... }))
 */
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = { errorHandler, asyncHandler, sendError, sendOk };
