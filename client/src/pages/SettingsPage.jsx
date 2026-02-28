import { useState, useEffect } from 'react';
import { FaWhatsapp, FaCheck, FaTimes, FaGoogle, FaKey, FaPlug, FaSpinner, FaDatabase, FaTrash, FaCog } from 'react-icons/fa';
import axios from 'axios';
import { useApp } from '../context/AppContext';
import { io } from 'socket.io-client';
import { API_URL, SOCKET_URL, LS_KEYS } from '../config';
// Environment flags
const IS_TEST_ENV = import.meta.env.VITE_ENV === 'test';
const IS_PRODUCTION_ENV = import.meta.env.PROD && import.meta.env.VITE_ENV !== 'test' && import.meta.env.VITE_ENV !== 'local';

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

  // Employee page settings
  const [tasksPerPage, setTasksPerPage] = useState(3);
  const [tasksPerPageSaving, setTasksPerPageSaving] = useState(false);
  const [tasksPerPageSaved, setTasksPerPageSaved] = useState(false);

  // Workday settings
  const [workdayStartTime, setWorkdayStartTime] = useState('08:00');
  const [workdayStartTimeSaving, setWorkdayStartTimeSaving] = useState(false);
  const [workdayStartTimeSaved, setWorkdayStartTimeSaved] = useState(false);
  const [workdayEndTime, setWorkdayEndTime] = useState('18:00');
  const [workdayEndTimeSaving, setWorkdayEndTimeSaving] = useState(false);
  const [workdayEndTimeSaved, setWorkdayEndTimeSaved] = useState(false);

  // Manager selection setting
  const [managerEmployeeId, setManagerEmployeeId] = useState('');
  const [managerSaving, setManagerSaving] = useState(false);
  const [managerSaved, setManagerSaved] = useState(false);
  const [employeesList, setEmployeesList] = useState([]);

  // Set up Socket.IO connection for real-time WhatsApp updates
  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.on('whatsapp:qr', ({ qrDataUrl }) => {
      setQrCode(qrDataUrl);  // qrDataUrl is already a data URL, use directly in img src
      setWhatsappStatus(prev => ({ ...prev, needsAuth: true, isReady: false }));
      setSuccessMessage('╫í╫¿╫ץ╫º ╫נ╫¬ ╫פ╫º╫ץ╫ף ╫ס╫ר╫£╫ñ╫ץ╫ƒ ╫⌐╫£╫ת');
    });

    newSocket.on('whatsapp:authenticated', () => {
      setQrCode(null); // Hide QR immediately
      setSuccessMessage('Γ£ף QR ╫á╫í╫¿╫º! ╫₧╫נ╫¬╫ק╫£ ╫נ╫¬ ╫פ╫ק╫ש╫ס╫ץ╫¿...');
    });

    newSocket.on('whatsapp:ready', () => {
      setQrCode(null);
      setWhatsappStatus({ isReady: true, needsAuth: false, isInitialized: true });
      setSuccessMessage('╫₧╫ק╫ץ╫ס╫¿ ╫£╫ץ╫ץ╫נ╫ר╫í╫נ╫ñ ╫ס╫פ╫ª╫£╫ק╫פ!');
    });

    newSocket.on('whatsapp:disconnected', ({ reason }) => {
      setQrCode(null);
      setWhatsappStatus({ isReady: false, needsAuth: false, isInitialized: false });
      if (reason !== 'manual') {
        setError('WhatsApp disconnected: ' + reason);
      }
    });

    // Loading progress during initialization
    newSocket.on('whatsapp:loading', ({ percent, message }) => {
      setSuccessMessage(`╫ר╫ץ╫ó╫ƒ WhatsApp: ${percent}%`);
    });

    // Auth failure event
    newSocket.on('whatsapp:auth_failure', ({ message }) => {
      console.error('WhatsApp auth failure:', message);
      setQrCode(null);
      setWhatsappStatus({ isReady: false, needsAuth: false, isInitialized: false });
      setError('╫⌐╫ע╫ש╫נ╫¬ ╫נ╫ש╫₧╫ץ╫¬ WhatsApp. ╫á╫í╫פ ╫£╫פ╫¬╫ק╫ס╫¿ ╫₧╫ק╫ף╫⌐.');
      setSuccessMessage(null);
    });

    // Initialization timeout - ready event never fired
    newSocket.on('whatsapp:init_timeout', ({ message }) => {
      console.error('WhatsApp initialization timeout');
      setError(message || '╫פ╫ק╫ש╫ס╫ץ╫¿ ╫á╫¬╫º╫ó. ╫ש╫⌐ ╫£╫á╫í╫ץ╫¬ ╫£╫פ╫¬╫á╫¬╫º ╫ץ╫£╫פ╫¬╫ק╫ס╫¿ ╫₧╫ק╫ף╫⌐.');
      setSuccessMessage(null);
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
          setSuccessMessage('╫₧╫ק╫ץ╫ס╫¿ ╫£╫ץ╫ץ╫נ╫ר╫í╫נ╫ñ ╫ס╫פ╫ª╫£╫ק╫פ!');
        }
      } catch (error) {
        console.error('Error checking WhatsApp status:', error);
        setWhatsappStatus({
          isReady: false,
          needsAuth: false,
          isInitialized: false,
          error: '╫£╫נ ╫á╫ש╫¬╫ƒ ╫£╫פ╫¬╫ק╫ס╫¿ ╫£╫⌐╫¿╫¬'
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
        setSuccessMessage('╫¢╫ס╫¿ ╫₧╫ק╫ץ╫ס╫¿ ╫£╫ץ╫ץ╫נ╫ר╫í╫נ╫ñ!');
        setWhatsappStatus({ isReady: true, needsAuth: false, isInitialized: true });
      } else if (response.data.initializing) {
        setSuccessMessage('╫₧╫נ╫¬╫ק╫£... ╫º╫ץ╫ף QR ╫ש╫ץ╫ñ╫ש╫ó ╫ס╫º╫¿╫ץ╫ס');
      }
    } catch (error) {
      setError(error.response?.data?.error || '╫⌐╫ע╫ש╫נ╫פ ╫ס╫פ╫¬╫ק╫ס╫¿╫ץ╫¬ ╫£╫ץ╫ץ╫נ╫ר╫í╫נ╫ñ');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    setError(null);

    try {
      await axios.post(`${API_URL}/whatsapp/disconnect`);
      setSuccessMessage('╫פ╫¬╫á╫¬╫º ╫₧╫ץ╫ץ╫נ╫ר╫í╫נ╫ñ');
      setWhatsappStatus({ isReady: false, needsAuth: false, isInitialized: false });
      setQrCode(null);
    } catch (error) {
      setError(error.response?.data?.error || '╫⌐╫ע╫ש╫נ╫פ ╫ס╫פ╫¬╫á╫¬╫º╫ץ╫¬');
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

  // Fetch tasks per page setting on mount
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

  // Fetch workday settings on mount
  useEffect(() => {
    const fetchWorkdaySettings = async () => {
      try {
        const [startRes, endRes] = await Promise.all([
          axios.get(`${API_URL}/accounts/settings/workday_start_time`),
          axios.get(`${API_URL}/accounts/settings/workday_end_time`)
        ]);

        if (startRes.data.value) {
          setWorkdayStartTime(startRes.data.value);
        }
        if (endRes.data.value) {
          setWorkdayEndTime(endRes.data.value);
        }
      } catch (err) {
        console.error('Error fetching workday settings:', err);
      }
    };
    fetchWorkdaySettings();
  }, []);

  // Fetch employees list and manager setting on mount
  useEffect(() => {
    const fetchManagerData = async () => {
      try {
        const [empRes, settingRes] = await Promise.all([
          axios.get(`${API_URL}/employees`),
          axios.get(`${API_URL}/accounts/settings/manager_employee_id`).catch(() => ({ data: { value: '' } }))
        ]);
        setEmployeesList(empRes.data || []);
        if (settingRes.data.value) {
          setManagerEmployeeId(settingRes.data.value);
        }
      } catch (err) {
        console.error('Error fetching manager data:', err);
      }
    };
    fetchManagerData();
  }, []);

  const handleManagerChange = async (newValue) => {
    setManagerEmployeeId(newValue);
    setManagerSaving(true);
    setManagerSaved(false);
    try {
      await axios.put(`${API_URL}/accounts/settings/manager_employee_id`, { value: newValue });
      // Sync to localStorage so MyDay picks it up immediately (even without remount)
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

  const handleWorkdayStartTimeChange = async (newValue) => {
    setWorkdayStartTime(newValue);
    setWorkdayStartTimeSaving(true);
    setWorkdayStartTimeSaved(false);

    try {
      await axios.put(`${API_URL}/accounts/settings/workday_start_time`, {
        value: newValue
      });
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
      await axios.put(`${API_URL}/accounts/settings/workday_end_time`, {
        value: newValue
      });
      setWorkdayEndTimeSaved(true);
      setTimeout(() => setWorkdayEndTimeSaved(false), 2000);
    } catch (err) {
      console.error('Error saving workday end time:', err);
    } finally {
      setWorkdayEndTimeSaving(false);
    }
  };

  const handleTasksPerPageChange = async (newValue) => {
    const value = parseInt(newValue, 10);
    if (value < 1 || value > 20) return;

    setTasksPerPage(value);
    setTasksPerPageSaving(true);
    setTasksPerPageSaved(false);

    try {
      await axios.put(`${API_URL}/accounts/settings/tasks_per_employee_page`, {
        value: value.toString()
      });
      setTasksPerPageSaved(true);
      setTimeout(() => setTasksPerPageSaved(false), 2000);
    } catch (err) {
      console.error('Error saving tasks per page:', err);
    } finally {
      setTasksPerPageSaving(false);
    }
  };

  const handleGoogleConnect = async () => {
    if (!googleApiKey.trim()) {
      setGoogleError('╫ש╫⌐ ╫£╫פ╫צ╫ש╫ƒ ╫₧╫ñ╫¬╫ק API');
      return;
    }

    setGoogleLoading(true);
    setGoogleError(null);
    setGoogleSuccess(null);

    try {
      const response = await axios.post(`${API_URL}/accounts/google-translate/connect`, {
        apiKey: googleApiKey
      });

      setGoogleSuccess(`╫ק╫ש╫ס╫ץ╫¿ ╫פ╫ª╫£╫ש╫ק! ╫¬╫¿╫ע╫ץ╫¥ ╫ס╫ף╫ש╫º╫פ: "${response.data.testTranslation}"`);
      setGoogleApiKey('');

      // Refresh accounts status
      const statusResponse = await axios.get(`${API_URL}/accounts/status`);
      setAccountsStatus(statusResponse.data);
    } catch (err) {
      setGoogleError(err.response?.data?.details || err.response?.data?.error || '╫⌐╫ע╫ש╫נ╫פ ╫ס╫ק╫ש╫ס╫ץ╫¿');
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
      setGoogleSuccess('Google Translate ╫á╫ץ╫¬╫º ╫ס╫פ╫ª╫£╫ק╫פ');

      // Refresh accounts status
      const statusResponse = await axios.get(`${API_URL}/accounts/status`);
      setAccountsStatus(statusResponse.data);
    } catch (err) {
      setGoogleError(err.response?.data?.error || '╫⌐╫ע╫ש╫נ╫פ ╫ס╫á╫ש╫¬╫ץ╫º');
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
        setGoogleSuccess(`╫ס╫ף╫ש╫º╫פ ╫פ╫ª╫£╫ש╫ק╫פ! "Hello" Γזע "${response.data.testResult}"`);
      } else {
        setGoogleError(response.data.error);
      }
    } catch (err) {
      setGoogleError(err.response?.data?.error || '╫⌐╫ע╫ש╫נ╫פ ╫ס╫ס╫ף╫ש╫º╫פ');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">╫פ╫ע╫ף╫¿╫ץ╫¬</h1>

      {/* WhatsApp Integration Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <FaWhatsapp className="text-green-500 text-3xl" />
          <h2 className="text-2xl font-semibold">╫ק╫ש╫ס╫ץ╫¿ ╫£╫ץ╫ץ╫נ╫ר╫í╫נ╫ñ</h2>
        </div>

        <p className="text-gray-600 mb-4">
          ╫ק╫ס╫¿ ╫נ╫¬ ╫ק╫⌐╫ס╫ץ╫ƒ ╫פ╫ץ╫ץ╫נ╫ר╫í╫נ╫ñ ╫⌐╫£╫ת ╫¢╫ף╫ש ╫£╫⌐╫£╫ץ╫ק ╫₧╫⌐╫ש╫₧╫ץ╫¬ ╫£╫ó╫ץ╫ס╫ף╫ש╫¥ ╫ש╫⌐╫ש╫¿╫ץ╫¬ ╫ף╫¿╫ת ╫פ╫₧╫ó╫¿╫¢╫¬
        </p>

        {/* WhatsApp Status Indicator */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
          <div className="flex items-center gap-3">
            {whatsappStatus.isReady ? (
              <>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="font-semibold text-green-800">WhatsApp ╫₧╫ק╫ץ╫ס╫¿ ╫ץ╫₧╫ץ╫¢╫ƒ</span>
              </>
            ) : whatsappStatus.needsAuth ? (
              <>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className="font-semibold text-yellow-800">WhatsApp ╫₧╫₧╫¬╫ש╫ƒ ╫£╫נ╫ש╫₧╫ץ╫¬ - ╫í╫¿╫ץ╫º QR</span>
              </>
            ) : whatsappStatus.error ? (
              <>
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="font-semibold text-red-800">{whatsappStatus.error}</span>
              </>
            ) : (
              <>
                <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                <span className="font-semibold text-gray-600">╫í╫ר╫ר╫ץ╫í ╫£╫נ ╫ש╫ף╫ץ╫ó</span>
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
            <h3 className="font-semibold mb-3 text-center">╫í╫¿╫ץ╫º ╫נ╫¬ ╫פ╫º╫ץ╫ף ╫ס╫ץ╫ץ╫נ╫ר╫í╫נ╫ñ ╫⌐╫£╫ת</h3>
            <div className="flex flex-col items-center gap-3">
              <img
                src={qrCode}
                alt="WhatsApp QR Code"
                className="w-64 h-64 border-4 border-gray-300 rounded-lg"
              />
              <div className="text-sm text-gray-600 text-center">
                <p>1. ╫ñ╫¬╫ק ╫נ╫¬ ╫ץ╫ץ╫נ╫ר╫í╫נ╫ñ ╫ס╫ר╫£╫ñ╫ץ╫ƒ</p>
                <p>2. ╫£╫ק╫Ñ ╫ó╫£ ╫¬╫ñ╫¿╫ש╫ר (Γכ«) {'>'} ╫₧╫¢╫⌐╫ש╫¿╫ש╫¥ ╫₧╫º╫ץ╫⌐╫¿╫ש╫¥</p>
                <p>3. ╫í╫¿╫ץ╫º ╫נ╫¬ ╫פ╫º╫ץ╫ף</p>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                ╫פ╫º╫ץ╫ף ╫¬╫º╫ú ╫£╫₧╫⌐╫ת 2 ╫ף╫º╫ץ╫¬
              </div>
            </div>
          </div>
        )}

        {/* Connection Status Badge */}
        {whatsappStatus.isReady && (
          <div className="mb-4 p-4 bg-green-100 border-2 border-green-500 rounded-lg flex items-center justify-center gap-2">
            <FaCheck className="text-green-600 text-xl" />
            <span className="text-green-800 font-semibold">╫₧╫ק╫ץ╫ס╫¿ ╫£╫ץ╫ץ╫נ╫ר╫í╫נ╫ñ</span>
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
            {isCheckingStatus ? '╫ס╫ץ╫ף╫º ╫í╫ר╫ר╫ץ╫í...' : loading ? '╫₧╫¬╫ק╫ס╫¿...' : whatsappStatus.isReady ? 'QR ╫ק╫ף╫⌐ (╫£╫ק╫ש╫ס╫ץ╫¿ ╫₧╫ק╫ף╫⌐)' : qrCode ? 'QR ╫ק╫ף╫⌐' : '╫פ╫¬╫ק╫ס╫¿ ╫£╫ץ╫ץ╫נ╫ר╫í╫נ╫ñ'}
          </button>
          {whatsappStatus.isReady && (
            <button
              onClick={handleDisconnect}
              disabled={loading}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <FaTimes />
              {loading ? '╫₧╫¬╫á╫¬╫º...' : '╫פ╫¬╫á╫¬╫º ╫₧╫ץ╫ץ╫נ╫ר╫í╫נ╫ñ'}
            </button>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg text-sm text-gray-700">
          <p className="font-semibold mb-2">Γה╣∩╕ן ╫ק╫⌐╫ץ╫ס ╫£╫ף╫ó╫¬:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>╫í╫¿╫ש╫º╫¬ QR code ╫á╫ף╫¿╫⌐╫¬ ╫ñ╫ó╫¥ ╫נ╫ק╫¬</li>
            <li>╫פ╫í╫⌐╫ƒ ╫á╫⌐╫₧╫¿ ╫ס╫⌐╫¿╫¬ ╫ע╫¥ ╫נ╫ק╫¿╫ש ╫פ╫ñ╫ó╫£╫פ ╫₧╫ק╫ף╫⌐</li>
            <li>╫£╫ק╫Ñ ╫ó╫£ "╫פ╫¬╫á╫¬╫º ╫₧╫ץ╫ץ╫נ╫ר╫í╫נ╫ñ" ╫¢╫ף╫ש ╫£╫פ╫¬╫á╫¬╫º ╫ש╫ף╫á╫ש╫¬</li>
            <li>╫פ╫פ╫ץ╫ף╫ó╫ץ╫¬ ╫á╫⌐╫£╫ק╫ץ╫¬ ╫₧╫ק╫⌐╫ס╫ץ╫ƒ ╫פ╫ץ╫ץ╫נ╫ר╫í╫נ╫ñ ╫פ╫נ╫ש╫⌐╫ש ╫⌐╫£╫ת</li>
            <li>╫ó╫£╫ש╫ת ╫£╫ץ╫ץ╫ף╫נ ╫⌐╫£╫ó╫ץ╫ס╫ף╫ש╫¥ ╫ש╫⌐ ╫₧╫í╫ñ╫¿╫ש ╫ר╫£╫ñ╫ץ╫ƒ ╫¬╫º╫ש╫á╫ש╫¥ ╫ס╫₧╫ó╫¿╫¢╫¬</li>
          </ul>
        </div>
      </div>

      {/* Google Translate Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mt-6">
        <div className="flex items-center gap-3 mb-4">
          <FaGoogle className="text-blue-500 text-3xl" />
          <h2 className="text-2xl font-semibold">Google Translate (╫ס╫¬╫⌐╫£╫ץ╫¥)</h2>
        </div>

        <p className="text-gray-600 mb-4">
          ╫ק╫ס╫¿ ╫נ╫¬ Google Cloud Translation API ╫£╫¬╫¿╫ע╫ץ╫¥ ╫פ╫ó╫¿╫ץ╫¬ ╫ó╫ץ╫ס╫ף╫ש╫¥. ╫₧╫⌐╫₧╫⌐ ╫¢╫ע╫ש╫ס╫ץ╫ש ╫¢╫⌐-Gemini API ╫₧╫ע╫ש╫ó ╫£╫₧╫ע╫ס╫£╫¬ ╫פ╫⌐╫ש╫₧╫ץ╫⌐ ╫פ╫ק╫ש╫á╫₧╫ש╫¬.
        </p>

        {/* Status Indicator */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {accountsStatus?.googleTranslate?.connected ? (
                <>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="font-semibold text-green-800">╫₧╫ק╫ץ╫ס╫¿</span>
                  {accountsStatus?.googleTranslate?.apiKeyMasked && (
                    <span className="text-sm text-gray-500">
                      (╫₧╫ñ╫¬╫ק: {accountsStatus.googleTranslate.apiKeyMasked})
                    </span>
                  )}
                </>
              ) : (
                <>
                  <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                  <span className="font-semibold text-gray-600">╫£╫נ ╫₧╫ק╫ץ╫ס╫¿</span>
                </>
              )}
            </div>
            {accountsStatus?.googleTranslate?.usage && (
              <div className="text-sm text-gray-500">
                ╫¬╫¿╫ע╫ץ╫₧╫ש╫¥: {accountsStatus.googleTranslate.usage.success} ╫פ╫ª╫£╫ש╫ק╫ץ, {accountsStatus.googleTranslate.usage.failed} ╫á╫¢╫⌐╫£╫ץ
              </div>
            )}
          </div>
        </div>

        {/* Gemini Status (informational) */}
        {accountsStatus?.gemini && (
          <div className="mb-4 p-3 bg-purple-50 rounded-lg text-sm">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${accountsStatus.gemini.connected ? 'bg-green-500' : 'bg-gray-400'}`}></span>
              <span className="font-semibold">Gemini API (╫ק╫ש╫á╫₧╫ש):</span>
              <span>{accountsStatus.gemini.connected ? '╫ñ╫ó╫ש╫£' : '╫£╫נ ╫₧╫ץ╫ע╫ף╫¿'}</span>
              {accountsStatus.gemini.usage && (
                <span className="text-gray-500 mr-2">
                  ({accountsStatus.gemini.usage.success} ╫¬╫¿╫ע╫ץ╫₧╫ש╫¥, {accountsStatus.gemini.usage.failed} ╫¢╫⌐╫£╫ץ╫á╫ץ╫¬)
                </span>
              )}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Gemini ╫₧╫⌐╫₧╫⌐ ╫º╫ץ╫ף╫¥ (╫ק╫ש╫á╫₧╫ש). Google Translate ╫₧╫⌐╫₧╫⌐ ╫¿╫º ╫¢╫ע╫ש╫ס╫ץ╫ש ╫¢╫⌐╫á╫ע╫₧╫¿╫¬ ╫פ╫₧╫¢╫í╫פ.
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
              ╫₧╫ñ╫¬╫ק API ╫⌐╫£ Google Cloud
            </label>
            <input
              type="password"
              value={googleApiKey}
              onChange={(e) => setGoogleApiKey(e.target.value)}
              placeholder="╫פ╫¢╫á╫í ╫נ╫¬ ╫₧╫ñ╫¬╫ק ╫פ-API ╫⌐╫£╫ת"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              dir="ltr"
            />
            <p className="text-xs text-gray-500 mt-1">
              ╫פ╫₧╫ñ╫¬╫ק ╫á╫⌐╫₧╫¿ ╫ס╫ª╫ץ╫¿╫פ ╫₧╫נ╫ץ╫ס╫ר╫ק╫¬ ╫ס╫⌐╫¿╫¬ ╫ץ╫£╫נ ╫₧╫ץ╫ª╫ע ╫⌐╫ץ╫ס ╫£╫נ╫ק╫¿ ╫פ╫⌐╫₧╫ש╫¿╫פ
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
              {googleLoading ? '╫₧╫¬╫ק╫ס╫¿...' : '╫פ╫¬╫ק╫ס╫¿ ╫£-Google Translate'}
            </button>
          ) : (
            <>
              <button
                onClick={handleGoogleTest}
                disabled={googleLoading}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {googleLoading ? <FaSpinner className="animate-spin" /> : <FaCheck />}
                {googleLoading ? '╫ס╫ץ╫ף╫º...' : '╫ס╫ף╫ץ╫º ╫ק╫ש╫ס╫ץ╫¿'}
              </button>
              <button
                onClick={handleGoogleDisconnect}
                disabled={googleLoading}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {googleLoading ? <FaSpinner className="animate-spin" /> : <FaTimes />}
                {googleLoading ? '╫₧╫á╫¬╫º...' : '╫á╫¬╫º ╫ק╫ש╫ס╫ץ╫¿'}
              </button>
            </>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg text-sm text-gray-700">
          <p className="font-semibold mb-2">Γה╣∩╕ן ╫נ╫ש╫ת ╫£╫פ╫⌐╫ש╫ע ╫₧╫ñ╫¬╫ק API:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>╫פ╫ש╫¢╫á╫í ╫£-<a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google Cloud Console</a></li>
            <li>╫ª╫ץ╫¿ ╫ñ╫¿╫ץ╫ש╫º╫ר ╫ק╫ף╫⌐ ╫נ╫ץ ╫ס╫ק╫¿ ╫ñ╫¿╫ץ╫ש╫º╫ר ╫º╫ש╫ש╫¥</li>
            <li>╫פ╫ñ╫ó╫£ ╫נ╫¬ Cloud Translation API</li>
            <li>╫ª╫ץ╫¿ API Key ╫ס-Credentials</li>
            <li>╫פ╫ó╫¬╫º ╫ץ╫פ╫ף╫ס╫º ╫נ╫¬ ╫פ╫₧╫ñ╫¬╫ק ╫¢╫נ╫ƒ</li>
          </ol>
          <p className="mt-2 text-xs text-gray-600">
            ≡ƒע░ ╫ó╫£╫ץ╫¬: 500,000 ╫¬╫ץ╫ץ╫ש╫¥ ╫¿╫נ╫⌐╫ץ╫á╫ש╫¥ ╫ס╫ק╫ץ╫ף╫⌐ ╫ק╫ש╫á╫¥, ╫£╫נ╫ק╫¿ ╫₧╫¢╫ƒ $20 ╫£╫₧╫ש╫£╫ש╫ץ╫ƒ ╫¬╫ץ╫ץ╫ש╫¥
          </p>
        </div>
      </div>

      {/* Employee Page Settings Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mt-6">
        <div className="flex items-center gap-3 mb-4">
          <FaCog className="text-gray-500 text-3xl" />
          <h2 className="text-2xl font-semibold">╫פ╫ע╫ף╫¿╫ץ╫¬ ╫ף╫ú ╫ó╫ץ╫ס╫ף</h2>
        </div>

        <p className="text-gray-600 mb-4">
          ╫פ╫ע╫ף╫¿ ╫¢╫₧╫פ ╫₧╫⌐╫ש╫₧╫ץ╫¬ ╫ש╫ץ╫ª╫ע╫ץ ╫ס╫¢╫£ ╫ñ╫ó╫¥ ╫ס╫ף╫ú ╫פ╫נ╫ש╫⌐╫ץ╫¿ ╫⌐╫£ ╫פ╫ó╫ץ╫ס╫ף. ╫¢╫נ╫⌐╫¿ ╫פ╫ó╫ץ╫ס╫ף ╫₧╫⌐╫£╫ש╫¥ ╫₧╫⌐╫ש╫₧╫פ, ╫פ╫ס╫נ╫פ ╫ס╫¬╫ץ╫¿ ╫₧╫ץ╫ñ╫ש╫ó╫פ ╫נ╫ץ╫ר╫ץ╫₧╫ר╫ש╫¬.
        </p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ╫₧╫í╫ñ╫¿ ╫₧╫⌐╫ש╫₧╫ץ╫¬ ╫ס╫ף╫ú
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
            <span className="text-gray-500">╫₧╫⌐╫ש╫₧╫ץ╫¬</span>
            {tasksPerPageSaving && (
              <span className="text-blue-500 flex items-center gap-1">
                <FaSpinner className="animate-spin" /> ╫⌐╫ץ╫₧╫¿...
              </span>
            )}
            {tasksPerPageSaved && (
              <span className="text-green-500 flex items-center gap-1">
                <FaCheck /> ╫á╫⌐╫₧╫¿!
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            ╫ס╫¿╫ש╫¿╫¬ ╫₧╫ק╫ף╫£: 3 ╫₧╫⌐╫ש╫₧╫ץ╫¬. ╫ר╫ץ╫ץ╫ק ╫₧╫ץ╫¬╫¿: 1-20 ╫₧╫⌐╫ש╫₧╫ץ╫¬.
          </p>
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg text-sm text-gray-700">
          <p className="font-semibold mb-2">Γה╣∩╕ן ╫נ╫ש╫ת ╫צ╫פ ╫ó╫ץ╫ס╫ף:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>╫פ╫ó╫ץ╫ס╫ף ╫¿╫ץ╫נ╫פ ╫¢╫ñ╫¬╫ץ╫¿ "╫º╫ש╫ס╫£╫¬╫ש ≡ƒסם" ╫£╫ñ╫á╫ש ╫⌐╫פ╫ץ╫נ ╫ש╫¢╫ץ╫£ ╫£╫í╫₧╫ƒ ╫₧╫⌐╫ש╫₧╫ץ╫¬</li>
            <li>╫£╫נ╫ק╫¿ ╫£╫ק╫ש╫ª╫פ ╫ó╫£ "╫º╫ש╫ס╫£╫¬╫ש", ╫₧╫ץ╫ª╫ע╫ץ╫¬ ╫ó╫ף {tasksPerPage} ╫₧╫⌐╫ש╫₧╫ץ╫¬</li>
            <li>╫¢╫נ╫⌐╫¿ ╫₧╫⌐╫ש╫₧╫פ ╫פ╫ץ╫⌐╫£╫₧╫פ, ╫פ╫₧╫⌐╫ש╫₧╫פ ╫פ╫ס╫נ╫פ ╫ס╫¬╫ץ╫¿ ╫₧╫ץ╫ñ╫ש╫ó╫פ</li>
            <li>╫₧╫ó╫¿╫¢╫¬ ╫¬╫ץ╫¿ ╫ף╫ש╫á╫₧╫ש╫¬ - ╫¬╫₧╫ש╫ף ╫ש╫⌐ ╫ó╫ף {tasksPerPage} ╫₧╫⌐╫ש╫₧╫ץ╫¬ ╫ñ╫ó╫ש╫£╫ץ╫¬</li>
          </ul>
        </div>
      </div>

      {/* Workday End Time Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mt-6">
        <div className="flex items-center gap-3 mb-4">
          <FaCog className="text-gray-500 text-3xl" />
          <h2 className="text-2xl font-semibold">╫פ╫ע╫ף╫¿╫ץ╫¬ ╫ש╫ץ╫¥ ╫ó╫ס╫ץ╫ף╫פ</h2>
        </div>

        <p className="text-gray-600 mb-4">
          ╫⌐╫ó╫¬ ╫í╫ש╫ץ╫¥ ╫ש╫ץ╫¥ ╫פ╫ó╫ס╫ץ╫ף╫פ. ╫₧╫⌐╫ש╫₧╫ץ╫¬ ╫ק╫ף-╫ñ╫ó╫₧╫ש╫ץ╫¬ ╫⌐╫á╫ץ╫ª╫¿╫ץ╫¬ ╫£╫ש╫ץ╫¥ ╫₧╫í╫ץ╫ש╫¥ ╫ש╫ש╫ק╫⌐╫ס╫ץ ╫ס╫נ╫ש╫ק╫ץ╫¿ ╫¿╫º ╫נ╫ק╫¿╫ש ╫⌐╫ó╫פ ╫צ╫ץ.
        </p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ╫⌐╫ó╫¬ ╫¬╫ק╫ש╫£╫¬ ╫ש╫ץ╫¥
          </label>
          <p className="text-xs text-gray-500 mb-2">
            ╫ס╫⌐╫ó╫פ ╫צ╫ץ ╫ש╫⌐╫£╫ק╫ץ ╫£╫ó╫ץ╫ס╫ף╫ש╫¥ ╫₧╫⌐╫ש╫₧╫ץ╫¬ ╫פ╫ש╫ץ╫¥ ╫ף╫¿╫ת WhatsApp (╫נ╫│-╫פ╫│)
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
                <FaSpinner className="animate-spin" /> ╫⌐╫ץ╫₧╫¿...
              </span>
            )}
            {workdayStartTimeSaved && (
              <span className="text-green-500 flex items-center gap-1">
                <FaCheck /> ╫á╫⌐╫₧╫¿!
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            ╫ס╫¿╫ש╫¿╫¬ ╫₧╫ק╫ף╫£: 08:00
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ╫⌐╫ó╫¬ ╫í╫ש╫ץ╫¥ ╫ש╫ץ╫¥
          </label>
          <div className="flex items-center gap-4">
            <input
              type="time"
              value={workdayEndTime}
              onChange={(e) => handleWorkdayEndTimeChange(e.target.value)}
              className="w-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-lg"
            />
            {workdayEndTimeSaving && (
              <span className="text-blue-500 flex items-center gap-1">
                <FaSpinner className="animate-spin" /> ╫⌐╫ץ╫₧╫¿...
              </span>
            )}
            {workdayEndTimeSaved && (
              <span className="text-green-500 flex items-center gap-1">
                <FaCheck /> ╫á╫⌐╫₧╫¿!
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            ╫ס╫¿╫ש╫¿╫¬ ╫₧╫ק╫ף╫£: 18:00
          </p>
        </div>
      </div>

      {/* Manager Selection Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mt-6">
        <div className="flex items-center gap-3 mb-4">
          <FaCog className="text-indigo-500 text-3xl" />
          <h2 className="text-2xl font-semibold">╫פ╫ע╫ף╫¿╫ץ╫¬ ╫₧╫á╫פ╫£</h2>
        </div>
        <p className="text-gray-600 mb-4">
          ╫ס╫ק╫¿ ╫נ╫¬ ╫פ╫ó╫ץ╫ס╫ף ╫⌐╫₧╫⌐╫₧╫⌐ ╫¢╫₧╫á╫פ╫£. ╫פ╫ñ╫ש╫£╫ר╫¿ "╫₧╫⌐╫ש╫₧╫ץ╫¬ ╫₧╫á╫פ╫£" ╫ס╫ש╫ץ╫¥ ╫⌐╫£╫ש ╫ש╫ª╫ש╫ע ╫¿╫º ╫₧╫⌐╫ש╫₧╫ץ╫¬ ╫פ╫₧╫⌐╫ץ╫ש╫¢╫ץ╫¬ ╫נ╫£╫ש╫ץ.
        </p>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ╫פ╫₧╫á╫פ╫£
          </label>
          <div className="flex items-center gap-4">
            <select
              value={managerEmployeeId}
              onChange={(e) => handleManagerChange(e.target.value)}
              className="w-64 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Γאפ ╫£╫£╫נ ╫₧╫á╫פ╫£ Γאפ</option>
              {employeesList.map((emp) => (
                <option key={emp.id} value={String(emp.id)}>
                  {emp.name} {emp.position ? `(${emp.position})` : ''}
                </option>
              ))}
            </select>
            {managerSaving && (
              <span className="text-blue-500 flex items-center gap-1">
                <FaSpinner className="animate-spin" /> ╫⌐╫ץ╫₧╫¿...
              </span>
            )}
            {managerSaved && (
              <span className="text-green-500 flex items-center gap-1">
                <FaCheck /> ╫á╫⌐╫₧╫¿!
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            ╫פ╫₧╫á╫פ╫£ ╫פ╫á╫ס╫ק╫¿ ╫ש╫פ╫ש╫פ ╫ס╫¿╫ש╫¿╫¬ ╫פ╫₧╫ק╫ף╫£ ╫ס╫ó╫¬ ╫פ╫ץ╫í╫ñ╫¬ ╫₧╫⌐╫ש╫₧╫פ ╫₧"╫פ╫ש╫ץ╫¥ ╫⌐╫£╫ש"
          </p>
        </div>
      </div>

      {/* Data Management Section (hidden in production) */}
      {!IS_PRODUCTION_ENV && (
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <div className="flex items-center gap-3 mb-4">
            <FaDatabase className="text-gray-500 text-3xl" />
            <h2 className="text-2xl font-semibold">╫á╫ש╫פ╫ץ╫£ ╫á╫¬╫ץ╫á╫ש╫¥</h2>
          </div>

          <p className="text-gray-600 mb-4">
            ╫¢╫£╫ש╫¥ ╫£╫á╫ש╫פ╫ץ╫£ ╫á╫¬╫ץ╫á╫ש ╫פ╫₧╫ó╫¿╫¢╫¬. ╫פ╫⌐╫¬╫₧╫⌐ ╫ס╫צ╫פ╫ש╫¿╫ץ╫¬ - ╫ñ╫ó╫ץ╫£╫ץ╫¬ ╫נ╫£╫ץ ╫₧╫⌐╫ñ╫ש╫ó╫ץ╫¬ ╫ó╫£ ╫¢╫£ ╫פ╫á╫¬╫ץ╫á╫ש╫¥.
          </p>

          <div className="flex gap-3">
            <button
              onClick={async () => {
                if (confirm('╫ñ╫ó╫ץ╫£╫פ ╫צ╫ץ ╫¬╫₧╫ק╫º ╫נ╫¬ ╫¢╫£ ╫פ╫á╫¬╫ץ╫á╫ש╫¥ ╫פ╫º╫ש╫ש╫₧╫ש╫¥ ╫ץ╫¬╫ר╫ó╫ƒ ╫á╫¬╫ץ╫á╫ש ╫ף╫₧╫פ. ╫£╫פ╫₧╫⌐╫ש╫ת?')) {
                  try {
                    await seedData();
                    alert('╫á╫¬╫ץ╫á╫ש ╫ף╫₧╫פ ╫á╫ר╫ó╫á╫ץ ╫ס╫פ╫ª╫£╫ק╫פ!');
                  } catch (error) {
                    alert('╫⌐╫ע╫ש╫נ╫פ: ' + error.message);
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
              ╫ר╫ó╫ƒ ╫á╫¬╫ץ╫á╫ש ╫ף╫₧╫פ
            </button>
            <button
              onClick={async () => {
                if (confirm('╫נ╫צ╫פ╫¿╫פ! ╫ñ╫ó╫ץ╫£╫פ ╫צ╫ץ ╫¬╫₧╫ק╫º ╫נ╫¬ ╫¢╫£ ╫פ╫á╫¬╫ץ╫á╫ש╫¥ ╫ץ╫£╫נ ╫á╫ש╫¬╫ƒ ╫£╫⌐╫ק╫צ╫¿. ╫פ╫נ╫¥ ╫נ╫¬╫פ ╫ס╫ר╫ץ╫ק?')) {
                  if (confirm('╫פ╫נ╫¥ ╫נ╫¬╫פ ╫ס╫ר╫ץ╫ק ╫£╫ק╫£╫ץ╫ר╫ש╫ƒ? ╫¢╫£ ╫פ╫á╫¬╫ץ╫á╫ש╫¥ ╫ש╫ש╫₧╫ק╫º╫ץ ╫£╫ª╫₧╫ש╫¬╫ץ╫¬!')) {
                    try {
                      await clearData();
                      alert('╫¢╫£ ╫פ╫á╫¬╫ץ╫á╫ש╫¥ ╫á╫₧╫ק╫º╫ץ ╫ס╫פ╫ª╫£╫ק╫פ');
                    } catch (error) {
                      alert('╫⌐╫ע╫ש╫נ╫פ: ' + error.message);
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
              ╫á╫º╫פ ╫á╫¬╫ץ╫á╫ש╫¥
            </button>
          </div>

          {/* Warning Box */}
          <div className="mt-6 p-4 bg-yellow-50 rounded-lg text-sm text-gray-700 border border-yellow-200">
            <p className="font-semibold mb-2">Γתá∩╕ן ╫נ╫צ╫פ╫¿╫פ:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>╫ר╫ó╫ƒ ╫á╫¬╫ץ╫á╫ש ╫ף╫₧╫פ</strong> - ╫₧╫ץ╫ק╫º ╫נ╫¬ ╫¢╫£ ╫פ╫á╫¬╫ץ╫á╫ש╫¥ ╫פ╫º╫ש╫ש╫₧╫ש╫¥ ╫ץ╫₧╫ק╫£╫ש╫ú ╫נ╫ץ╫¬╫¥ ╫ס╫á╫¬╫ץ╫á╫ש ╫ף╫₧╫פ ╫£╫ס╫ף╫ש╫º╫ץ╫¬</li>
              <li><strong>╫á╫º╫פ ╫á╫¬╫ץ╫á╫ש╫¥</strong> - ╫₧╫ץ╫ק╫º ╫נ╫¬ ╫¢╫£ ╫פ╫á╫¬╫ץ╫á╫ש╫¥ ╫£╫ª╫₧╫ש╫¬╫ץ╫¬. ╫ñ╫ó╫ץ╫£╫פ ╫צ╫ץ ╫נ╫ש╫á╫פ ╫פ╫ñ╫ש╫¢╫פ!</li>
            </ul>
            {!IS_TEST_ENV && (
              <p className="mt-3 text-red-600 font-semibold">
                ≡ƒפע ╫ñ╫ó╫ץ╫£╫ץ╫¬ ╫נ╫£╫ץ ╫₧╫ץ╫⌐╫ס╫¬╫ץ╫¬ ╫ס╫í╫ס╫ש╫ס╫¬ ╫פ╫ñ╫¿╫ץ╫ף╫º╫⌐╫ƒ ╫£╫₧╫á╫ש╫ó╫¬ ╫₧╫ק╫ש╫º╫¬ ╫á╫¬╫ץ╫á╫ש╫¥ ╫ס╫ר╫ó╫ץ╫¬
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
