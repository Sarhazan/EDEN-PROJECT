import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { FaWhatsapp, FaCheck, FaTimes, FaSpinner, FaSave } from 'react-icons/fa';
import { API_URL, BACKEND_URL, SOCKET_URL } from '../config';

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [whatsappStatus, setWhatsappStatus] = useState({
    isReady: false,
    needsAuth: false,
    isInitialized: false,
    qr: null,
  });

  const [workdayStartTime, setWorkdayStartTime] = useState('08:00');
  const [workdayEndTime, setWorkdayEndTime] = useState('18:00');
  const [employees, setEmployees] = useState([]);
  const [managerEmployeeId, setManagerEmployeeId] = useState('');

  useEffect(() => {
    let socket;

    const loadInitial = async () => {
      try {
        setError('');

        const [statusRes, settingsRes, employeesRes] = await Promise.all([
          axios.get(`${API_URL}/whatsapp/status`),
          axios.get(`${API_URL}/accounts/settings`),
          axios.get(`${API_URL}/employees`),
        ]);

        setWhatsappStatus((prev) => ({
          ...prev,
          isReady: !!statusRes.data?.isReady,
          needsAuth: !!statusRes.data?.needsAuth,
          isInitialized: !!statusRes.data?.isInitialized,
          qr: statusRes.data?.qrDataUrl || null,
        }));

        const settings = settingsRes.data || {};
        setWorkdayStartTime(settings.workday_start_time || '08:00');
        setWorkdayEndTime(settings.workday_end_time || '18:00');
        setManagerEmployeeId(settings.manager_employee_id ? String(settings.manager_employee_id) : '');

        setEmployees(Array.isArray(employeesRes.data) ? employeesRes.data : []);
      } catch (e) {
        setError(e.response?.data?.error || 'שגיאה בטעינת ההגדרות');
      }
    };

    loadInitial();

    socket = io(SOCKET_URL || BACKEND_URL);

    socket.on('whatsapp:qr', ({ qrDataUrl }) => {
      setWhatsappStatus((prev) => ({ ...prev, qr: qrDataUrl || null, needsAuth: true, isReady: false }));
      setSuccess('סרוק את קוד ה-QR להתחברות ל-WhatsApp');
    });

    socket.on('whatsapp:ready', () => {
      setWhatsappStatus((prev) => ({ ...prev, isReady: true, needsAuth: false, isInitialized: true, qr: null }));
      setSuccess('WhatsApp מחובר בהצלחה');
    });

    socket.on('whatsapp:authenticated', () => {
      setSuccess('האימות הצליח, משלים התחברות...');
    });

    socket.on('whatsapp:disconnected', () => {
      setWhatsappStatus((prev) => ({ ...prev, isReady: false, needsAuth: true }));
    });

    socket.on('whatsapp:auth_failure', ({ message }) => {
      setError(message || 'שגיאת אימות WhatsApp');
    });

    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  const statusBadge = useMemo(() => {
    if (whatsappStatus.isReady) {
      return <span className="px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm">מחובר</span>;
    }
    if (whatsappStatus.needsAuth) {
      return <span className="px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 text-sm">ממתין לאימות</span>;
    }
    return <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm">לא מחובר</span>;
  }, [whatsappStatus]);

  const handleConnectWhatsapp = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      await axios.post(`${API_URL}/whatsapp/connect`);
      setSuccess('מאתחל WhatsApp... קוד QR יופיע אם נדרש');
    } catch (e) {
      setError(e.response?.data?.error || 'שגיאה בהתחברות ל-WhatsApp');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectWhatsapp = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      await axios.post(`${API_URL}/whatsapp/disconnect`);
      setWhatsappStatus((prev) => ({ ...prev, isReady: false, needsAuth: true, qr: null }));
      setSuccess('התנתקת מ-WhatsApp');
    } catch (e) {
      setError(e.response?.data?.error || 'שגיאה בהתנתקות מ-WhatsApp');
    } finally {
      setLoading(false);
    }
  };

  const saveWorkdaySettings = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      await axios.put(`${API_URL}/accounts/settings/workday_start_time`, { value: workdayStartTime });
      await axios.put(`${API_URL}/accounts/settings/workday_end_time`, { value: workdayEndTime });
      setSuccess('הגדרות יום העבודה נשמרו');
    } catch (e) {
      setError(e.response?.data?.error || 'שגיאה בשמירת הגדרות יום עבודה');
    } finally {
      setLoading(false);
    }
  };

  const saveManagerEmployee = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      await axios.put(`${API_URL}/accounts/settings/manager_employee_id`, {
        value: managerEmployeeId ? Number(managerEmployeeId) : null,
      });
      window.dispatchEvent(new Event('manager:changed'));
      setSuccess('עובד מנהל נשמר בהצלחה');
    } catch (e) {
      setError(e.response?.data?.error || 'שגיאה בשמירת עובד מנהל');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">הגדרות</h1>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 flex items-center gap-2">
          <FaTimes />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 rounded-lg bg-green-50 text-green-700 flex items-center gap-2">
          <FaCheck />
          <span>{success}</span>
        </div>
      )}

      <section className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <FaWhatsapp className="text-green-600" />
            חיבור ל-WhatsApp
          </h2>
          {statusBadge}
        </div>

        {whatsappStatus.qr && (
          <div className="mb-4 p-4 bg-slate-50 rounded-lg border">
            <p className="mb-3 font-medium">סרוק את קוד ה-QR באפליקציית WhatsApp:</p>
            <div className="flex justify-center">
              <img src={whatsappStatus.qr} alt="WhatsApp QR" className="max-w-[260px] rounded" />
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleConnectWhatsapp}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <FaSpinner className="animate-spin" /> : <FaWhatsapp />}
            התחבר / רענן QR
          </button>

          <button
            onClick={handleDisconnectWhatsapp}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
          >
            התנתק
          </button>
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-2xl font-semibold mb-4">יום עבודה</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">שעת התחלה</label>
            <input
              type="time"
              value={workdayStartTime}
              onChange={(e) => setWorkdayStartTime(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">שעת סיום</label>
            <input
              type="time"
              value={workdayEndTime}
              onChange={(e) => setWorkdayEndTime(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
        </div>

        <button
          onClick={saveWorkdaySettings}
          disabled={loading}
          className="mt-4 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
        >
          <FaSave /> שמור הגדרות יום עבודה
        </button>
      </section>

      <section className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold mb-4">עובד מנהל (למשימות מנהל)</h2>

        <select
          value={managerEmployeeId}
          onChange={(e) => setManagerEmployeeId(e.target.value)}
          className="w-full border rounded-lg px-3 py-2"
        >
          <option value="">ללא עובד מנהל</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.name} ({emp.phone || 'ללא טלפון'})
            </option>
          ))}
        </select>

        <button
          onClick={saveManagerEmployee}
          disabled={loading}
          className="mt-4 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
        >
          <FaSave /> שמור עובד מנהל
        </button>
      </section>
    </div>
  );
}
