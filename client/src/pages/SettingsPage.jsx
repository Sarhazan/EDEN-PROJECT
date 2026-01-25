import { useState, useEffect } from 'react';
import { FaWhatsapp, FaCheck, FaTimes } from 'react-icons/fa';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function SettingsPage() {
  const [whatsappStatus, setWhatsappStatus] = useState({
    isReady: false,
    needsAuth: false,
    isInitialized: false
  });
  const [qrCode, setQrCode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Load WhatsApp status on mount
  useEffect(() => {
    loadWhatsAppStatus();
  }, []);

  const loadWhatsAppStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/whatsapp/status`);
      setWhatsappStatus(response.data);
    } catch (error) {
      console.error('Error loading WhatsApp status:', error);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    setQrCode(null);

    try {
      const response = await axios.post(`${API_URL}/whatsapp/connect`, {}, { timeout: 60000 });

      if (response.data.isReady) {
        setSuccessMessage('כבר מחובר לוואטסאפ');
        setWhatsappStatus({ isReady: true, needsAuth: false, isInitialized: true });
      } else if (response.data.qrCode) {
        setQrCode(response.data.qrCode);
        // Poll for connection status
        startPolling();
      }
    } catch (error) {
      setError(error.response?.data?.error || 'שגיאה בהתחברות לוואטסאפ');
    } finally {
      setLoading(false);
    }
  };

  const startPolling = () => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await axios.get(`${API_URL}/whatsapp/status`);

        if (response.data.isReady) {
          setWhatsappStatus(response.data);
          setQrCode(null);
          setSuccessMessage('התחברת בהצלחה לוואטסאפ!');
          clearInterval(pollInterval);
        }
      } catch (error) {
        console.error('Error polling status:', error);
        clearInterval(pollInterval);
      }
    }, 2000);

    // Stop polling after 2 minutes
    setTimeout(() => clearInterval(pollInterval), 120000);
  };

  const handleDisconnect = async () => {
    if (!confirm('האם אתה בטוח שברצונך להתנתק מוואטסאפ?')) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await axios.post(`${API_URL}/whatsapp/disconnect`);
      setWhatsappStatus({ isReady: false, needsAuth: false, isInitialized: false });
      setSuccessMessage('התנתקת מוואטסאפ בהצלחה');
    } catch (error) {
      setError(error.response?.data?.error || 'שגיאה בהתנתקות מוואטסאפ');
    } finally {
      setLoading(false);
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

        {/* Connection Status */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="font-semibold">סטטוס חיבור:</span>
            <div className="flex items-center gap-2">
              {whatsappStatus.isReady ? (
                <>
                  <span className="text-green-600 font-semibold">מחובר</span>
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                </>
              ) : (
                <>
                  <span className="text-red-600 font-semibold">לא מחובר</span>
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* QR Code Display */}
        {qrCode && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold mb-3 text-center">סרוק את הקוד בוואטסאפ שלך</h3>
            <div className="flex flex-col items-center gap-3">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrCode)}`}
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

        {/* Action Buttons */}
        <div className="flex gap-3">
          {!whatsappStatus.isReady ? (
            <button
              onClick={handleConnect}
              disabled={loading}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <FaWhatsapp />
              {loading ? 'מתחבר...' : 'התחבר לוואטסאפ'}
            </button>
          ) : (
            <button
              onClick={handleDisconnect}
              disabled={loading}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'מתנתק...' : 'התנתק מוואטסאפ'}
            </button>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg text-sm text-gray-700">
          <p className="font-semibold mb-2">ℹ️ חשוב לדעת:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>החיבור לוואטסאפ נשמר באופן מקומי במערכת</li>
            <li>ניתן להתנתק בכל עת ולהתחבר מחדש</li>
            <li>ההודעות נשלחות מחשבון הוואטסאפ האישי שלך</li>
            <li>עליך לוודא שלעובדים יש מספרי טלפון תקינים במערכת</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
