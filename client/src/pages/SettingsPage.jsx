import { useState, useEffect } from 'react';
import {
  FaWhatsapp,
  FaCheck,
  FaTimes,
  FaGoogle,
  FaKey,
  FaPlug,
  FaSpinner,
  FaDatabase,
  FaTrash,
  FaCog,
} from 'react-icons/fa';
import axios from 'axios';
import { useApp } from '../context/AppContext';
import { io } from 'socket.io-client';
import { API_URL, SOCKET_URL, LS_KEYS, SHOW_DATA_CONTROLS } from '../config';

const IS_TEST_ENV = import.meta.env.VITE_ENV === 'test';

export default function SettingsPage() {
  const { seedData, clearData, employees: contextEmployees } = useApp();

  // WhatsApp state
  const [whatsappStatus, setWhatsappStatus] = useState({
    isReady: false,
    needsAuth: false,
    isInitialized: false,
    error: null,
  });
  const [qrCode, setQrCode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  // Google Translate state
  const [accountsStatus, setAccountsStatus] = useState(null);
  const [googleApiKey, setGoogleApiKey] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState(null);
  const [googleSuccess, setGoogleSuccess] = useState(null);

  // Tasks per page state
  const [tasksPerPage, setTasksPerPage] = useState(3);
  const [tasksPerPageSaving, setTasksPerPageSaving] = useState(false);
  const [tasksPerPageSaved, setTasksPerPageSaved] = useState(false);

  // Workday settings state
  const [workdayStartTime, setWorkdayStartTime] = useState('08:00');
  const [workdayStartTimeSaving, setWorkdayStartTimeSaving] = useState(false);
  const [workdayStartTimeSaved, setWorkdayStartTimeSaved] = useState(false);
  const [workdayEndTime, setWorkdayEndTime] = useState('18:00');
  const [workdayEndTimeSaving, setWorkdayEndTimeSaving] = useState(false);
  const [workdayEndTimeSaved, setWorkdayEndTimeSaved] = useState(false);

  // Manager selection state
  const [managerEmployeeId, setManagerEmployeeId] = useState('');
  const [managerSaving, setManagerSaving] = useState(false);
  const [managerSaved, setManagerSaved] = useState(false);
  // employeesList — use live AppContext employees (always in sync)
  const employeesList = contextEmployees || [];

  // ─── Socket.IO for real-time WhatsApp events ───────────────────────────────
  useEffect(() => {
    const newSocket = io(SOCKET_URL);

    newSocket.on('whatsapp:qr', ({ qrDataUrl }) => {
      setQrCode(qrDataUrl);
      setWhatsappStatus((prev) => ({ ...prev, needsAuth: true, isReady: false }));
      setSuccessMessage('סרוק את הקוד באפליקציית WhatsApp שלך');
    });

    newSocket.on('whatsapp:authenticated', () => {
      setQrCode(null);
      setSuccessMessage('✅ QR נסרק! משלים את החיבור...');
    });

    newSocket.on('whatsapp:ready', () => {
      setQrCode(null);
      setWhatsappStatus({ isReady: true, needsAuth: false, isInitialized: true, error: null });
      setSuccessMessage('מחובר ל-WhatsApp בהצלחה!');
    });

    newSocket.on('whatsapp:disconnected', ({ reason }) => {
      setQrCode(null);
      setWhatsappStatus({ isReady: false, needsAuth: false, isInitialized: false, error: null });
      if (reason !== 'manual') {
        setError('WhatsApp disconnected: ' + reason);
      }
    });

    newSocket.on('whatsapp:loading', ({ percent }) => {
      setSuccessMessage(`טוען WhatsApp: ${percent}%`);
    });

    newSocket.on('whatsapp:auth_failure', ({ message }) => {
      setQrCode(null);
      setWhatsappStatus({ isReady: false, needsAuth: false, isInitialized: false, error: null });
      setError('שגיאת אימות WhatsApp. נא להתחבר מחדש.');
      setSuccessMessage(null);
    });

    newSocket.on('whatsapp:init_timeout', ({ message }) => {
      setError(message || 'החיבור נכשל. יש לנסות להתחבר ולהתחבר מחדש.');
      setSuccessMessage(null);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // ─── QR HTTP polling fallback (when Socket.IO doesn't deliver the QR) ──────
  // Polls GET /whatsapp/qr every 3s if status says needsAuth but qrCode is still null
  useEffect(() => {
    if (!whatsappStatus.needsAuth || qrCode) return;

    let active = true;
    const poll = async () => {
      try {
        const res = await axios.get(`${API_URL}/whatsapp/qr`);
        if (active && res.data?.qrDataUrl) {
          setQrCode(res.data.qrDataUrl);
          setSuccessMessage('סרוק את הקוד באפליקציית WhatsApp שלך');
        }
      } catch {
        // QR not ready yet — keep polling
      }
    };

    poll(); // immediate first check
    const interval = setInterval(poll, 3000);
    return () => { active = false; clearInterval(interval); };
  }, [whatsappStatus.needsAuth, qrCode]);

  // ─── Initial data load ─────────────────────────────────────────────────────
  useEffect(() => {
    const checkWhatsAppStatus = async () => {
      try {
        const response = await axios.get(`${API_URL}/whatsapp/status`);
        setWhatsappStatus({
          isReady: response.data.isReady,
          needsAuth: response.data.needsAuth,
          isInitialized: response.data.isInitialized,
          error: response.data.error || null,
        });
        if (response.data.isReady) {
          setSuccessMessage('מחובר ל-WhatsApp בהצלחה!');
        }
      } catch (e) {
        setWhatsappStatus({ isReady: false, needsAuth: false, isInitialized: false, error: 'לא ניתן להתחבר לשרת' });
      } finally {
        setIsCheckingStatus(false);
      }
    };
    checkWhatsAppStatus();
  }, []);

  useEffect(() => {
    const fetchAccountsStatus = async () => {
      try {
        const response = await axios.get(`${API_URL}/accounts/status`);
        setAccountsStatus(response.data);
      } catch (err) {
        console.error('Error fetching accounts status:', err);
      }
    };
    fetchAccountsStatus();
  }, []);

  useEffect(() => {
    const fetchTasksPerPage = async () => {
      try {
        const response = await axios.get(`${API_URL}/accounts/settings/tasks_per_employee_page`);
        if (response.data.value) {
          setTasksPerPage(parseInt(response.data.value, 10));
        }
      } catch (err) {
        console.error('Error fetching tasks per page:', err);
      }
    };
    fetchTasksPerPage();
  }, []);

  useEffect(() => {
    const fetchWorkdaySettings = async () => {
      try {
        const [startRes, endRes] = await Promise.all([
          axios.get(`${API_URL}/accounts/settings/workday_start_time`),
          axios.get(`${API_URL}/accounts/settings/workday_end_time`),
        ]);
        if (startRes.data.value) setWorkdayStartTime(startRes.data.value);
        if (endRes.data.value) setWorkdayEndTime(endRes.data.value);
      } catch (err) {
        console.error('Error fetching workday settings:', err);
      }
    };
    fetchWorkdaySettings();
  }, []);

  useEffect(() => {
    const fetchManagerData = async () => {
      try {
        const settingRes = await axios.get(`${API_URL}/accounts/settings/manager_employee_id`).catch(() => ({ data: { value: '' } }));
        if (settingRes.data.value) setManagerEmployeeId(settingRes.data.value);
      } catch (err) {
        console.error('Error fetching manager data:', err);
      }
    };
    fetchManagerData();
  }, []);

  // ─── WhatsApp handlers ─────────────────────────────────────────────────────
  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      // If already initialized but not ready (e.g. QR expired / not scanned),
      // disconnect first so the server creates a fresh session and new QR.
      if (whatsappStatus.isInitialized && !whatsappStatus.isReady) {
        await axios.post(`${API_URL}/whatsapp/disconnect`).catch(() => {});
        setQrCode(null);
        setWhatsappStatus({ isReady: false, needsAuth: false, isInitialized: false, error: null });
      }

      const response = await axios.post(`${API_URL}/whatsapp/connect`);
      if (response.data.isReady) {
        setSuccessMessage('כבר מחובר ל-WhatsApp!');
        setWhatsappStatus({ isReady: true, needsAuth: false, isInitialized: true, error: null });
      } else if (response.data.initializing) {
        setSuccessMessage('מאתחל... קוד QR יופיע בקרוב');
      }
    } catch (e) {
      setError(e.response?.data?.error || 'שגיאה בהתחברות ל-WhatsApp');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    setError(null);
    try {
      await axios.post(`${API_URL}/whatsapp/disconnect`);
      setSuccessMessage('התנתקת מ-WhatsApp');
      setWhatsappStatus({ isReady: false, needsAuth: false, isInitialized: false, error: null });
      setQrCode(null);
    } catch (e) {
      setError(e.response?.data?.error || 'שגיאה בהתנתקות');
    } finally {
      setLoading(false);
    }
  };

  // ─── Google Translate handlers ─────────────────────────────────────────────
  const handleGoogleConnect = async () => {
    if (!googleApiKey.trim()) {
      setGoogleError('יש להזין מפתח API');
      return;
    }
    setGoogleLoading(true);
    setGoogleError(null);
    setGoogleSuccess(null);
    try {
      const response = await axios.post(`${API_URL}/accounts/google-translate/connect`, {
        apiKey: googleApiKey,
      });
      setGoogleSuccess(`חיבור הצליח! תרגום בדיקה: "${response.data.testTranslation}"`);
      setGoogleApiKey('');
      const statusResponse = await axios.get(`${API_URL}/accounts/status`);
      setAccountsStatus(statusResponse.data);
    } catch (err) {
      setGoogleError(err.response?.data?.details || err.response?.data?.error || 'שגיאה בחיבור');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleDisconnect = async () => {
    setGoogleLoading(true);
    setGoogleError(null);
    setGoogleSuccess(null);
    try {
      await axios.post(`${API_URL}/accounts/google-translate/disconnect`);
      setGoogleSuccess('Google Translate נותק בהצלחה');
      const statusResponse = await axios.get(`${API_URL}/accounts/status`);
      setAccountsStatus(statusResponse.data);
    } catch (err) {
      setGoogleError(err.response?.data?.error || 'שגיאה בניתוק');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleTest = async () => {
    setGoogleLoading(true);
    setGoogleError(null);
    setGoogleSuccess(null);
    try {
      const response = await axios.post(`${API_URL}/accounts/google-translate/test`);
      if (response.data.success) {
        setGoogleSuccess(`בדיקה הצליחה! "Hello" → "${response.data.testResult}"`);
      } else {
        setGoogleError(response.data.error);
      }
    } catch (err) {
      setGoogleError(err.response?.data?.error || 'שגיאה בבדיקה');
    } finally {
      setGoogleLoading(false);
    }
  };

  // ─── Tasks per page handler ────────────────────────────────────────────────
  const handleTasksPerPageChange = async (newValue) => {
    const value = parseInt(newValue, 10);
    if (value < 1 || value > 20) return;
    setTasksPerPage(value);
    setTasksPerPageSaving(true);
    setTasksPerPageSaved(false);
    try {
      await axios.put(`${API_URL}/accounts/settings/tasks_per_employee_page`, {
        value: value.toString(),
      });
      setTasksPerPageSaved(true);
      setTimeout(() => setTasksPerPageSaved(false), 2000);
    } catch (err) {
      console.error('Error saving tasks per page:', err);
    } finally {
      setTasksPerPageSaving(false);
    }
  };

  // ─── Workday handlers ──────────────────────────────────────────────────────
  const handleWorkdayStartTimeChange = async (newValue) => {
    setWorkdayStartTime(newValue);
    setWorkdayStartTimeSaving(true);
    setWorkdayStartTimeSaved(false);
    try {
      await axios.put(`${API_URL}/accounts/settings/workday_start_time`, { value: newValue });
      setWorkdayStartTimeSaved(true);
      setTimeout(() => setWorkdayStartTimeSaved(false), 2000);
    } catch (err) {
      console.error('Error saving workday start time:', err);
    } finally {
      setWorkdayStartTimeSaving(false);
    }
  };

  const handleWorkdayEndTimeChange = async (newValue) => {
    setWorkdayEndTime(newValue);
    setWorkdayEndTimeSaving(true);
    setWorkdayEndTimeSaved(false);
    try {
      await axios.put(`${API_URL}/accounts/settings/workday_end_time`, { value: newValue });
      setWorkdayEndTimeSaved(true);
      setTimeout(() => setWorkdayEndTimeSaved(false), 2000);
    } catch (err) {
      console.error('Error saving workday end time:', err);
    } finally {
      setWorkdayEndTimeSaving(false);
    }
  };

  // ─── Manager handler ───────────────────────────────────────────────────────
  const handleManagerChange = async (newValue) => {
    setManagerEmployeeId(newValue);
    setManagerSaving(true);
    setManagerSaved(false);
    try {
      await axios.put(`${API_URL}/accounts/settings/manager_employee_id`, { value: newValue });
      if (newValue) {
        localStorage.setItem(LS_KEYS.MANAGER_EMPLOYEE_ID, newValue);
      } else {
        localStorage.removeItem(LS_KEYS.MANAGER_EMPLOYEE_ID);
      }
      window.dispatchEvent(new CustomEvent('manager:changed', { detail: { id: newValue } }));
      setManagerSaved(true);
      setTimeout(() => setManagerSaved(false), 2000);
    } catch (err) {
      console.error('Error saving manager setting:', err);
    } finally {
      setManagerSaving(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">הגדרות</h1>

      {/* ── WhatsApp Section ── */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <FaWhatsapp className="text-green-500 text-3xl" />
          <h2 className="text-2xl font-semibold">חיבור ל-WhatsApp</h2>
        </div>

        <p className="text-gray-600 mb-4">
          חבר את חשבון ה-WhatsApp שלך כדי לשלוח הודעות לעובדים ישירות דרך המערכת
        </p>

        {/* Status indicator */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
          <div className="flex items-center gap-3">
            {whatsappStatus.isReady ? (
              <>
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="font-semibold text-green-800">WhatsApp מחובר ומוכן</span>
              </>
            ) : whatsappStatus.needsAuth ? (
              <>
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="font-semibold text-yellow-800">WhatsApp ממתין לאימות - סרוק QR</span>
              </>
            ) : whatsappStatus.error ? (
              <>
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="font-semibold text-red-800">{whatsappStatus.error}</span>
              </>
            ) : (
              <>
                <div className="w-3 h-3 rounded-full bg-gray-400" />
                <span className="font-semibold text-gray-600">סטטוס לא ידוע</span>
              </>
            )}
          </div>
        </div>

        {/* Success message */}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-100 text-green-800 rounded-lg flex items-center gap-2">
            <FaCheck />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-800 rounded-lg flex items-center gap-2">
            <FaTimes />
            <span>{error}</span>
          </div>
        )}

        {/* QR Code */}
        {qrCode && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold mb-3 text-center">סרוק את הקוד ב-WhatsApp שלך</h3>
            <div className="flex flex-col items-center gap-3">
              <img
                src={qrCode}
                alt="WhatsApp QR Code"
                className="w-64 h-64 border-4 border-gray-300 rounded-lg"
              />
              <div className="text-sm text-gray-600 text-center">
                <p>1. פתח את WhatsApp בטלפון</p>
                <p>2. לחץ על תפריט (⋮) &gt; מכשירים מקושרים</p>
                <p>3. סרוק את הקוד</p>
              </div>
              <div className="text-xs text-gray-500 mt-2">הקוד תקף למשך 2 דקות</div>
            </div>
          </div>
        )}

        {/* Connected badge */}
        {whatsappStatus.isReady && (
          <div className="mb-4 p-4 bg-green-100 border-2 border-green-500 rounded-lg flex items-center justify-center gap-2">
            <FaCheck className="text-green-600 text-xl" />
            <span className="text-green-800 font-semibold">מחובר ל-WhatsApp</span>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleConnect}
            disabled={loading || isCheckingStatus}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <FaWhatsapp />
            {isCheckingStatus
              ? 'בודק סטטוס...'
              : loading
              ? 'מתחבר...'
              : whatsappStatus.isReady
              ? 'QR חדש (לחיבור מחדש)'
              : qrCode
              ? 'QR חדש'
              : 'התחבר ל-WhatsApp'}
          </button>
          {whatsappStatus.isReady && (
            <button
              onClick={handleDisconnect}
              disabled={loading}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <FaTimes />
              {loading ? 'מתנתק...' : 'התנתק מ-WhatsApp'}
            </button>
          )}
        </div>

        {/* Info box */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg text-sm text-gray-700">
          <p className="font-semibold mb-2">ℹ️ חשוב לדעת:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>סריקת QR code נדרשת פעם אחת</li>
            <li>הסשן נשמר בשרת עם אחרי הפעלה מחדש</li>
            <li>לחץ על "התנתק מ-WhatsApp" כדי להתנתק ידנית</li>
            <li>ההודעות נשלחות מחשבון ה-WhatsApp האישי שלך</li>
            <li>עליך לוודא שלעובדים יש מספר טלפון שמור במערכת</li>
          </ul>
        </div>
      </div>

      {/* ── Google Translate Section ── */}
      <div className="bg-white rounded-lg shadow-md p-6 mt-6">
        <div className="flex items-center gap-3 mb-4">
          <FaGoogle className="text-blue-500 text-3xl" />
          <h2 className="text-2xl font-semibold">Google Translate (בתשלום)</h2>
        </div>

        <p className="text-gray-600 mb-4">
          חבר את Google Cloud Translation API לתרגום הערות עובדים. כרגע כאשר Gemini API מוגדר, הוא משמש כחלופה החינמית.
        </p>

        {/* Status indicator */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {accountsStatus?.googleTranslate?.connected ? (
                <>
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="font-semibold text-green-800">מחובר</span>
                  {accountsStatus?.googleTranslate?.apiKeyMasked && (
                    <span className="text-sm text-gray-500">
                      (מפתח: {accountsStatus.googleTranslate.apiKeyMasked})
                    </span>
                  )}
                </>
              ) : (
                <>
                  <div className="w-3 h-3 rounded-full bg-gray-400" />
                  <span className="font-semibold text-gray-600">לא מחובר</span>
                </>
              )}
            </div>
            {accountsStatus?.googleTranslate?.usage && (
              <div className="text-sm text-gray-500">
                תרגומים: {accountsStatus.googleTranslate.usage.success} הצליחו,{' '}
                {accountsStatus.googleTranslate.usage.failed} נכשלו
              </div>
            )}
          </div>
        </div>

        {/* Gemini status (informational) */}
        {accountsStatus?.gemini && (
          <div className="mb-4 p-3 bg-purple-50 rounded-lg text-sm">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  accountsStatus.gemini.connected ? 'bg-green-500' : 'bg-gray-400'
                }`}
              />
              <span className="font-semibold">Gemini API (חינמי):</span>
              <span>{accountsStatus.gemini.connected ? 'פעיל' : 'לא מוגדר'}</span>
              {accountsStatus.gemini.usage && (
                <span className="text-gray-500 mr-2">
                  ({accountsStatus.gemini.usage.success} תרגומים,{' '}
                  {accountsStatus.gemini.usage.failed} כשלונות)
                </span>
              )}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Gemini משמש קודם (חינמי). Google Translate משמש רק כגיבוי כאשר הבקשה נכשלת.
            </p>
          </div>
        )}

        {/* Google feedback messages */}
        {googleSuccess && (
          <div className="mb-4 p-4 bg-green-100 text-green-800 rounded-lg flex items-center gap-2">
            <FaCheck />
            <span>{googleSuccess}</span>
          </div>
        )}
        {googleError && (
          <div className="mb-4 p-4 bg-red-100 text-red-800 rounded-lg flex items-center gap-2">
            <FaTimes />
            <span>{googleError}</span>
          </div>
        )}

        {/* API Key input (only when not connected) */}
        {!accountsStatus?.googleTranslate?.connected && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FaKey className="inline ml-1" />
              מפתח API של Google Cloud
            </label>
            <input
              type="password"
              value={googleApiKey}
              onChange={(e) => setGoogleApiKey(e.target.value)}
              placeholder="הכנס את מפתח ה-API שלך"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              dir="ltr"
            />
            <p className="text-xs text-gray-500 mt-1">
              המפתח נשמר בצורה מאובטחת בשרת ולא מוצג שוב לאחר השמירה
            </p>
          </div>
        )}

        {/* Google action buttons */}
        <div className="flex gap-3">
          {!accountsStatus?.googleTranslate?.connected ? (
            <button
              onClick={handleGoogleConnect}
              disabled={googleLoading || !googleApiKey.trim()}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {googleLoading ? <FaSpinner className="animate-spin" /> : <FaPlug />}
              {googleLoading ? 'מתחבר...' : 'התחבר ל-Google Translate'}
            </button>
          ) : (
            <>
              <button
                onClick={handleGoogleTest}
                disabled={googleLoading}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {googleLoading ? <FaSpinner className="animate-spin" /> : <FaCheck />}
                {googleLoading ? 'בודק...' : 'בדוק חיבור'}
              </button>
              <button
                onClick={handleGoogleDisconnect}
                disabled={googleLoading}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {googleLoading ? <FaSpinner className="animate-spin" /> : <FaTimes />}
                {googleLoading ? 'מנתק...' : 'נתק חיבור'}
              </button>
            </>
          )}
        </div>

        {/* Google info box */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg text-sm text-gray-700">
          <p className="font-semibold mb-2">ℹ️ איך להשיג מפתח API:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>
              היכנס ל-
              <a
                href="https://console.cloud.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Google Cloud Console
              </a>
            </li>
            <li>צור פרויקט חדש או בחר פרויקט קיים</li>
            <li>הפעל את Cloud Translation API</li>
            <li>צור API Key ב-Credentials</li>
            <li>העתק והדבק את המפתח כאן</li>
          </ol>
          <p className="mt-2 text-xs text-gray-600">
            💡 עלות: 500,000 תווים ראשונים בחינם, לאחר מכן $20 למיליון תווים
          </p>
        </div>
      </div>

      {/* ── Tasks Per Page Section ── */}
      <div className="bg-white rounded-lg shadow-md p-6 mt-6">
        <div className="flex items-center gap-3 mb-4">
          <FaCog className="text-gray-500 text-3xl" />
          <h2 className="text-2xl font-semibold">הגדרות דף עובד</h2>
        </div>

        <p className="text-gray-600 mb-4">
          הגדר כמה משימות יוצגו בכל פעם בדף האישור של כל עובד. כאשר העובד מסלים משימה, הבאה בתור מופיעה אוטומטית.
        </p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            מספר משימות בדף
          </label>
          <div className="flex items-center gap-4">
            <input
              type="number"
              min="1"
              max="20"
              value={tasksPerPage}
              onChange={(e) => handleTasksPerPageChange(e.target.value)}
              className="w-24 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-lg"
            />
            <span className="text-gray-500">משימות</span>
            {tasksPerPageSaving && (
              <span className="text-blue-500 flex items-center gap-1">
                <FaSpinner className="animate-spin" /> שומר...
              </span>
            )}
            {tasksPerPageSaved && (
              <span className="text-green-500 flex items-center gap-1">
                <FaCheck /> נשמר!
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2">ברירת מחדל: 3 משימות. טווח מותר: 1-20 משימות.</p>
        </div>

        {/* Info box */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg text-sm text-gray-700">
          <p className="font-semibold mb-2">ℹ️ איך זה עובד:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>העובד רואה כפתור "קיבלתי 📋" לפני שהוא יכול לראות משימות</li>
            <li>לאחר לחיצה על "קיבלתי", מוצגות עד {tasksPerPage} משימות</li>
            <li>כאשר משימה הושלמה, המשימה הבאה בתור מופיעה אוטומטית</li>
            <li>מערכת תור דינמית - תמיד יש עד {tasksPerPage} משימות פעילות</li>
          </ul>
        </div>
      </div>

      {/* ── Workday Settings Section ── */}
      <div className="bg-white rounded-lg shadow-md p-6 mt-6">
        <div className="flex items-center gap-3 mb-4">
          <FaCog className="text-gray-500 text-3xl" />
          <h2 className="text-2xl font-semibold">הגדרות יום עבודה</h2>
        </div>

        <p className="text-gray-600 mb-4">
          שעות יום העבודה. משימות חד-פעמיות שנוצרו ליום מסוים יישלחו באחרי שעה זו.
        </p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">שעת תחילת יום</label>
          <p className="text-xs text-gray-500 mb-2">
            בשעה זו ישלחו לעובדים משימות היום דרך WhatsApp (א-ה)
          </p>
          <div className="flex items-center gap-4">
            <input
              type="time"
              value={workdayStartTime}
              onChange={(e) => handleWorkdayStartTimeChange(e.target.value)}
              className="w-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-lg"
            />
            {workdayStartTimeSaving && (
              <span className="text-blue-500 flex items-center gap-1">
                <FaSpinner className="animate-spin" /> שומר...
              </span>
            )}
            {workdayStartTimeSaved && (
              <span className="text-green-500 flex items-center gap-1">
                <FaCheck /> נשמר!
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2">ברירת מחדל: 08:00</p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">שעת סיום יום</label>
          <div className="flex items-center gap-4">
            <input
              type="time"
              value={workdayEndTime}
              onChange={(e) => handleWorkdayEndTimeChange(e.target.value)}
              className="w-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-lg"
            />
            {workdayEndTimeSaving && (
              <span className="text-blue-500 flex items-center gap-1">
                <FaSpinner className="animate-spin" /> שומר...
              </span>
            )}
            {workdayEndTimeSaved && (
              <span className="text-green-500 flex items-center gap-1">
                <FaCheck /> נשמר!
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2">ברירת מחדל: 18:00</p>
        </div>
      </div>

      {/* ── Manager Selection Section ── */}
      <div className="bg-white rounded-lg shadow-md p-6 mt-6">
        <div className="flex items-center gap-3 mb-4">
          <FaCog className="text-indigo-500 text-3xl" />
          <h2 className="text-2xl font-semibold">הגדרות מנהל</h2>
        </div>
        <p className="text-gray-600 mb-4">
          בחר את העובד שמשמש כמנהל. הפילטר "משימות מנהל" ביום שלי יציג רק משימות המיועדות אליו.
        </p>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">המנהל</label>
          <div className="flex items-center gap-4">
            <select
              value={managerEmployeeId}
              onChange={(e) => handleManagerChange(e.target.value)}
              className="w-64 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">⬜ ללא מנהל ⬜</option>
              {employeesList.map((emp) => (
                <option key={emp.id} value={String(emp.id)}>
                  {emp.name} {emp.position ? `(${emp.position})` : ''}
                </option>
              ))}
            </select>
            {managerSaving && (
              <span className="text-blue-500 flex items-center gap-1">
                <FaSpinner className="animate-spin" /> שומר...
              </span>
            )}
            {managerSaved && (
              <span className="text-green-500 flex items-center gap-1">
                <FaCheck /> נשמר!
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            המנהל הנבחר יהיה ברירת המחדל בעת הצגת משימה מ"היום שלי"
          </p>
        </div>
      </div>

      {/* ── Data Management Section (non-production only) ── */}
      {SHOW_DATA_CONTROLS && (
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <div className="flex items-center gap-3 mb-4">
            <FaDatabase className="text-gray-500 text-3xl" />
            <h2 className="text-2xl font-semibold">ניהול נתונים</h2>
          </div>

          <p className="text-gray-600 mb-4">
            כלים לניהול נתוני המערכת. השתמש בזהירות - פעולות אלו מחקות או מאפסות את כל הנתונים.
          </p>

          <div className="flex gap-3">
            <button
              onClick={async () => {
                if (confirm('פעולה זו תמחק את כל הנתונים הקיימים ותטען נתוני דמה. להמשיך?')) {
                  try {
                    await seedData();
                    alert('נתוני דמה נטענו בהצלחה!');
                  } catch (e) {
                    alert('שגיאה: ' + e.message);
                  }
                }
              }}
              disabled={!IS_TEST_ENV}
              className={`flex-1 font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                IS_TEST_ENV
                  ? 'bg-blue-500 hover:bg-blue-600 text-white cursor-pointer'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <FaDatabase />
              טען נתוני דמה
            </button>
            <button
              onClick={async () => {
                if (confirm('אזהרה! פעולה זו תמחק את כל הנתונים ולא ניתן לשחזר. האם אתה בטוח?')) {
                  if (confirm('האם אתה בטוח לחלוטין? כל הנתונים ימחקו לצמיתות!')) {
                    try {
                      await clearData();
                      alert('כל הנתונים נמחקו בהצלחה');
                    } catch (e) {
                      alert('שגיאה: ' + e.message);
                    }
                  }
                }
              }}
              disabled={!IS_TEST_ENV}
              className={`flex-1 font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                IS_TEST_ENV
                  ? 'bg-red-500 hover:bg-red-600 text-white cursor-pointer'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <FaTrash />
              מחק נתונים
            </button>
          </div>

          {/* Warning box */}
          <div className="mt-6 p-4 bg-yellow-50 rounded-lg text-sm text-gray-700 border border-yellow-200">
            <p className="font-semibold mb-2">⚠️ אזהרה:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                <strong>טען נתוני דמה</strong> - מוחק את כל הנתונים הקיימים ומחליף אותם בנתוני דמה לבדיקות
              </li>
              <li>
                <strong>מחק נתונים</strong> - מוחק את כל הנתונים לצמיתות. פעולה זו אינה הפיכה!
              </li>
            </ul>
            {!IS_TEST_ENV && (
              <p className="mt-3 text-red-600 font-semibold">
                🔒 פעולות אלו מושבתות בסביבת הפרודקשן למניעת מחיקת נתונים בטעות
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
