import { useState, useEffect } from 'react';
import { FaWhatsapp, FaCheck, FaTimes } from 'react-icons/fa';
import axios from 'axios';
import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';
// Socket.IO connects to base URL without /api path
const SOCKET_URL = API_URL.replace(/\/api$/, '');

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
  const [socket, setSocket] = useState(null);

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
    </div>
  );
}
