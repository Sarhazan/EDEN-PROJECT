function resolvePublicClientBaseUrl() {
  const isProduction = process.env.NODE_ENV === 'production';
  const publicClientUrl = process.env.PUBLIC_CLIENT_URL;
  const publicApiUrl = process.env.PUBLIC_API_URL;
  const localClientUrl = process.env.CLIENT_URL;

  const rawBase = isProduction
    ? (publicClientUrl || publicApiUrl || localClientUrl || 'http://localhost:3002')
    : (publicClientUrl || localClientUrl || publicApiUrl || 'http://localhost:5174');

  return String(rawBase || '')
    .replace(/\/$/, '')
    .replace(/\/api\/?$/, '');
}

function buildPublicClientUrl(pathname = '/') {
  const normalizedPath = String(pathname || '/').startsWith('/')
    ? String(pathname || '/')
    : `/${String(pathname || '/')}`;

  return `${resolvePublicClientBaseUrl()}${normalizedPath}`;
}

function buildFormFillUrl(dispatchId) {
  return buildPublicClientUrl(`/forms/fill/${dispatchId}`);
}

module.exports = {
  resolvePublicClientBaseUrl,
  buildPublicClientUrl,
  buildFormFillUrl
};
