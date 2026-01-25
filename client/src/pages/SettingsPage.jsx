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
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  // Check WhatsApp status on component mount and poll every 10 seconds
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
    const interval = setInterval(checkStatus, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, []); // Run once on mount

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    setQrCode(null);

    try {
      const response = await axios.post(`${API_URL}/whatsapp/connect`, {}, { timeout: 60000 });

      if (response.data.isReady) {
        setSuccessMessage('מחובר לוואטסאפ בהצלחה!');
        setWhatsappStatus({ isReady: true, needsAuth: false, isInitialized: true });
      } else if (response.data.qrCode) {
        setQrCode(response.data.qrCode);
        setSuccessMessage('סרוק את הקוד עם הטלפון שלך');
        // Start polling to check when scan completes
        startPolling();
      }
    } catch (error) {
      setError(error.response?.data?.error || 'שגיאה בהתחברות לוואטסאפ');
    } finally {
      setLoading(false);
    }
  };

  const startPolling = () => {
    console.log('🔄 Starting WhatsApp status polling...');
    const pollInterval = setInterval(async () => {
      try {
        const response = await axios.get(`${API_URL}/whatsapp/status`);
        console.log('📊 WhatsApp status:', response.data);

        if (response.data.isReady) {
          // Scan successful!
          console.log('✅ WhatsApp connected! Stopping polling.');
          clearInterval(pollInterval);
          setQrCode(null);
          setWhatsappStatus({ isReady: true, needsAuth: false, isInitialized: true });
          setSuccessMessage('מחובר לוואטסאפ בהצלחה! תוכל עכשיו לשלוח הודעות');
        }
      } catch (error) {
        console.error('Error polling status:', error);
      }
    }, 2000); // Check every 2 seconds

    // Stop polling after 2 minutes
    setTimeout(() => {
      console.log('⏱️ Polling timeout - stopping after 2 minutes');
      clearInterval(pollInterval);
    }, 120000);
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
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg text-sm text-gray-700">
          <p className="font-semibold mb-2">ℹ️ חשוב לדעת:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>סריקת QR code נדרשת פעם אחת</li>
            <li>הסשן נשמר בשרת עד לעדכון הבא</li>
            <li>לאחר עדכון מערכת - צריך לסרוק QR מחדש</li>
            <li>ההודעות נשלחות מחשבון הוואטסאפ האישי שלך</li>
            <li>עליך לוודא שלעובדים יש מספרי טלפון תקינים במערכת</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
