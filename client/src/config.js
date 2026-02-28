// Single source of truth for all constants

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';
export const BACKEND_URL = API_URL.replace('/api', '');
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL
  ? import.meta.env.VITE_SOCKET_URL
  : (import.meta.env.PROD ? window.location.origin : 'http://localhost:3002');

export const SHOW_DATA_CONTROLS =
  import.meta.env.DEV ||
  import.meta.env.VITE_ENV === 'test' ||
  import.meta.env.VITE_ENV === 'local';

// localStorage keys - centralized to avoid typos
export const LS_KEYS = {
  STAR_FILTER: 'starFilter',
  MANAGER_FILTER: 'myDayManagerFilter',
  MANAGER_EMPLOYEE_ID: 'manager_employee_id',
  COLUMN_WIDTHS: 'myDayColumnWidths',
  IS_AUTHENTICATED: 'isAuthenticated',
  AUTH_ROLE: 'authRole',
};