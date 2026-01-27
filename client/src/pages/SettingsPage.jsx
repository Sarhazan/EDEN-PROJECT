import { useState, useEffect } from 'react';
import { FaWhatsapp, FaCheck, FaTimes, FaGoogle, FaKey, FaPlug, FaSpinner, FaDatabase, FaTrash } from 'react-icons/fa';
import axios from 'axios';
import { useApp } from '../context/AppContext';
import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';
// Socket.IO connects to base URL without /api path
const SOCKET_URL = API_URL.replace(/\/api$/, '');
// Check if we're in test environment (allow dangerous operations only in test)
const IS_TEST_ENV = import.meta.env.VITE_ENV === 'test';

export default function SettingsPage() {
  const { seedData, clearData } = useApp();
  const [whatsappStatus, setWhatsappStatus] = useState({
    isReady: false,
    needsAuth: false,
    isInitialized: false
  });
  const [qrCode, setQrCode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [socket, setSocket] = useState(null);

  // Google Translate state
  const [accountsStatus, setAccountsStatus] = useState(null);
  const [googleApiKey, setGoogleApiKey] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState(null);
  const [googleSuccess, setGoogleSuccess] = useState(null);

  // Set up Socket.IO connection for real-time WhatsApp updates
  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.on('whatsapp:qr', ({ qrDataUrl }) => {
      console.log('Received QR code via Socket.IO');
      setQrCode(qrDataUrl);  // qrDataUrl is already a data URL, use directly in img src
      setWhatsappStatus(prev => ({ ...prev, needsAuth: true, isReady: false }));
      setSuccessMessage('סרוק את הקוד בטלפון שלך');
    });

    newSocket.on('whatsapp:authenticated', () => {
      console.log('WhatsApp authenticated - initializing session...');
      setQrCode(null); // Hide QR immediately
      setSuccessMessage('✓ QR נסרק! מאתחל את החיבור...');
    });

    newSocket.on('whatsapp:ready', () => {
      console.log('WhatsApp ready via Socket.IO');
      setQrCode(null);
      setWhatsappStatus({ isReady: true, needsAuth: false, isInitialized: true });
      setSuccessMessage('מחובר לוואטסאפ בהצלחה!');
    });

    newSocket.on('whatsapp:disconnected', ({ reason }) => {
      console.log('WhatsApp disconnected:', reason);
      setQrCode(null);
      setWhatsappStatus({ isReady: false, needsAuth: false, isInitialized: false });
      if (reason !== 'manual') {
        setError('WhatsApp disconnected: ' + reason);
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Check WhatsApp status on component mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await axios.get(`${API_URL}/whatsapp/status`);
        const statusData = {
          isReady: response.data.isReady,
          needsAuth: response.data.needsAuth,
          isInitialized: response.data.isInitialized,
          error: response.data.error || null
        };
        setWhatsappStatus(statusData);

        if (response.data.isReady) {
          setSuccessMessage('מחובר לוואטסאפ בהצלחה!');
        }
      } catch (error) {
        console.error('Error checking WhatsApp status:', error);
        setWhatsappStatus({
          isReady: false,
          needsAuth: false,
          isInitialized: false,
          error: 'לא ניתן להתחבר לשרת'
        });
      } finally {
        setIsCheckingStatus(false);
      }
    };

    checkStatus();
  }, []);

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await axios.post(`${API_URL}/whatsapp/connect`);

      if (response.data.isReady) {
        setSuccessMessage('כבר מחובר לוואטסאפ!');
        setWhatsappStatus({ isReady: true, needsAuth: false, isInitialized: true });
      } else if (response.data.initializing) {
        setSuccessMessage('מאתחל... קוד QR יופיע בקרוב');
      }
    } catch (error) {
      setError(error.response?.data?.error || 'שגיאה בהתחברות לוואטסאפ');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    setError(null);

    try {
      await axios.post(`${API_URL}/whatsapp/disconnect`);
      setSuccessMessage('התנתק מוואטסאפ');
      setWhatsappStatus({ isReady: false, needsAuth: false, isInitialized: false });
      setQrCode(null);
    } catch (error) {
      setError(error.response?.data?.error || 'שגיאה בהתנתקות');
    } finally {
      setLoading(false);
    }
  };

  // Fetch accounts status on mount
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
        apiKey: googleApiKey
      });

      setGoogleSuccess(`חיבור הצליח! תרגום בדיקה: "${response.data.testTranslation}"`);
      setGoogleApiKey('');

      // Refresh accounts status
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

      // Refresh accounts status
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

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">הגדרות</h1>

      {/* WhatsApp Integration Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <FaWhatsapp className="text-green-500 text-3xl" />
          <h2 className="text-2xl font-semibold">חיבור לוואטסאפ</h2>
        </div>

        <p className="text-gray-600 mb-4">
          חבר את חשבון הוואטסאפ שלך כדי לשלוח משימות לעובדים ישירות דרך המערכת
        </p>

        {/* WhatsApp Status Indicator */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
          <div className="flex items-center gap-3">
            {whatsappStatus.isReady ? (
              <>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="font-semibold text-green-800">WhatsApp מחובר ומוכן</span>
              </>
            ) : whatsappStatus.needsAuth ? (
              <>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className="font-semibold text-yellow-800">WhatsApp ממתין לאימות - סרוק QR</span>
              </>
            ) : whatsappStatus.error ? (
              <>
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="font-semibold text-red-800">{whatsappStatus.error}</span>
              </>
            ) : (
              <>
                <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                <span className="font-semibold text-gray-600">סטטוס לא ידוע</span>
              </>
            )}
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-100 text-green-800 rounded-lg flex items-center gap-2">
            <FaCheck />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-800 rounded-lg flex items-center gap-2">
            <FaTimes />
            <span>{error}</span>
          </div>
        )}


        {/* QR Code Display */}
        {qrCode && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold mb-3 text-center">סרוק את הקוד בוואטסאפ שלך</h3>
            <div className="flex flex-col items-center gap-3">
              <img
                src={qrCode}
                alt="WhatsApp QR Code"
                className="w-64 h-64 border-4 border-gray-300 rounded-lg"
              />
              <div className="text-sm text-gray-600 text-center">
                <p>1. פתח את וואטסאפ בטלפון</p>
                <p>2. לחץ על תפריט (⋮) {'>'} מכשירים מקושרים</p>
                <p>3. סרוק את הקוד</p>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                הקוד תקף למשך 2 דקות
              </div>
            </div>
          </div>
        )}

        {/* Connection Status Badge */}
        {whatsappStatus.isReady && (
          <div className="mb-4 p-4 bg-green-100 border-2 border-green-500 rounded-lg flex items-center justify-center gap-2">
            <FaCheck className="text-green-600 text-xl" />
            <span className="text-green-800 font-semibold">מחובר לוואטסאפ</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleConnect}
            disabled={loading || isCheckingStatus}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <FaWhatsapp />
            {isCheckingStatus ? 'בודק סטטוס...' : loading ? 'מתחבר...' : whatsappStatus.isReady ? 'QR חדש (לחיבור מחדש)' : qrCode ? 'QR חדש' : 'התחבר לוואטסאפ'}
          </button>
          {whatsappStatus.isReady && (
            <button
              onClick={handleDisconnect}
              disabled={loading}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <FaTimes />
              {loading ? 'מתנתק...' : 'התנתק מוואטסאפ'}
            </button>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg text-sm text-gray-700">
          <p className="font-semibold mb-2">ℹ️ חשוב לדעת:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>סריקת QR code נדרשת פעם אחת</li>
            <li>הסשן נשמר בשרת גם אחרי הפעלה מחדש</li>
            <li>לחץ על "התנתק מוואטסאפ" כדי להתנתק ידנית</li>
            <li>ההודעות נשלחות מחשבון הוואטסאפ האישי שלך</li>
            <li>עליך לוודא שלעובדים יש מספרי טלפון תקינים במערכת</li>
          </ul>
        </div>
      </div>

      {/* Google Translate Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mt-6">
        <div className="flex items-center gap-3 mb-4">
          <FaGoogle className="text-blue-500 text-3xl" />
          <h2 className="text-2xl font-semibold">Google Translate (בתשלום)</h2>
        </div>

        <p className="text-gray-600 mb-4">
          חבר את Google Cloud Translation API לתרגום הערות עובדים. משמש כגיבוי כש-Gemini API מגיע למגבלת השימוש החינמית.
        </p>

        {/* Status Indicator */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {accountsStatus?.googleTranslate?.connected ? (
                <>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="font-semibold text-green-800">מחובר</span>
                  {accountsStatus?.googleTranslate?.apiKeyMasked && (
                    <span className="text-sm text-gray-500">
                      (מפתח: {accountsStatus.googleTranslate.apiKeyMasked})
                    </span>
                  )}
                </>
              ) : (
                <>
                  <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                  <span className="font-semibold text-gray-600">לא מחובר</span>
                </>
              )}
            </div>
            {accountsStatus?.googleTranslate?.usage && (
              <div className="text-sm text-gray-500">
                תרגומים: {accountsStatus.googleTranslate.usage.success} הצליחו, {accountsStatus.googleTranslate.usage.failed} נכשלו
              </div>
            )}
          </div>
        </div>

        {/* Gemini Status (informational) */}
        {accountsStatus?.gemini && (
          <div className="mb-4 p-3 bg-purple-50 rounded-lg text-sm">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${accountsStatus.gemini.connected ? 'bg-green-500' : 'bg-gray-400'}`}></span>
              <span className="font-semibold">Gemini API (חינמי):</span>
              <span>{accountsStatus.gemini.connected ? 'פעיל' : 'לא מוגדר'}</span>
              {accountsStatus.gemini.usage && (
                <span className="text-gray-500 mr-2">
                  ({accountsStatus.gemini.usage.success} תרגומים, {accountsStatus.gemini.usage.failed} כשלונות)
                </span>
              )}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Gemini משמש קודם (חינמי). Google Translate משמש רק כגיבוי כשנגמרת המכסה.
            </p>
          </div>
        )}

        {/* Success Message */}
        {googleSuccess && (
          <div className="mb-4 p-4 bg-green-100 text-green-800 rounded-lg flex items-center gap-2">
            <FaCheck />
            <span>{googleSuccess}</span>
          </div>
        )}

        {/* Error Message */}
        {googleError && (
          <div className="mb-4 p-4 bg-red-100 text-red-800 rounded-lg flex items-center gap-2">
            <FaTimes />
            <span>{googleError}</span>
          </div>
        )}

        {/* API Key Input (show only if not connected) */}
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

        {/* Action Buttons */}
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

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg text-sm text-gray-700">
          <p className="font-semibold mb-2">ℹ️ איך להשיג מפתח API:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>היכנס ל-<a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google Cloud Console</a></li>
            <li>צור פרויקט חדש או בחר פרויקט קיים</li>
            <li>הפעל את Cloud Translation API</li>
            <li>צור API Key ב-Credentials</li>
            <li>העתק והדבק את המפתח כאן</li>
          </ol>
          <p className="mt-2 text-xs text-gray-600">
            💰 עלות: 500,000 תווים ראשונים בחודש חינם, לאחר מכן $20 למיליון תווים
          </p>
        </div>
      </div>

      {/* Data Management Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mt-6">
        <div className="flex items-center gap-3 mb-4">
          <FaDatabase className="text-gray-500 text-3xl" />
          <h2 className="text-2xl font-semibold">ניהול נתונים</h2>
        </div>

        <p className="text-gray-600 mb-4">
          כלים לניהול נתוני המערכת. השתמש בזהירות - פעולות אלו משפיעות על כל הנתונים.
        </p>

        <div className="flex gap-3">
          <button
            onClick={async () => {
              if (confirm('פעולה זו תמחק את כל הנתונים הקיימים ותטען נתוני דמה. להמשיך?')) {
                try {
                  await seedData();
                  alert('נתוני דמה נטענו בהצלחה!');
                } catch (error) {
                  alert('שגיאה: ' + error.message);
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
                if (confirm('האם אתה בטוח לחלוטין? כל הנתונים יימחקו לצמיתות!')) {
                  try {
                    await clearData();
                    alert('כל הנתונים נמחקו בהצלחה');
                  } catch (error) {
                    alert('שגיאה: ' + error.message);
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
            נקה נתונים
          </button>
        </div>

        {/* Warning Box */}
        <div className="mt-6 p-4 bg-yellow-50 rounded-lg text-sm text-gray-700 border border-yellow-200">
          <p className="font-semibold mb-2">⚠️ אזהרה:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>טען נתוני דמה</strong> - מוחק את כל הנתונים הקיימים ומחליף אותם בנתוני דמה לבדיקות</li>
            <li><strong>נקה נתונים</strong> - מוחק את כל הנתונים לצמיתות. פעולה זו אינה הפיכה!</li>
          </ul>
          {!IS_TEST_ENV && (
            <p className="mt-3 text-red-600 font-semibold">
              🔒 פעולות אלו מושבתות בסביבת הפרודקשן למניעת מחיקת נתונים בטעות
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
