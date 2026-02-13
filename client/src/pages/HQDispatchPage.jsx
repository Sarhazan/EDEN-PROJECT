import { useEffect, useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import '../components/forms/datepicker-custom.css';

const API_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL
  : 'http://localhost:3002/api';

const parseISODate = (value) => {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

export default function HQDispatchPage() {
  const [employees, setEmployees] = useState([]);
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const today = new Date();
  const defaultDate = today.toISOString().slice(0, 10);

  const [form, setForm] = useState({
    title: '',
    description: '',
    start_date: defaultDate,
    start_time: '09:00',
    priority: 'normal',
    targetMode: 'all',
    managerIds: [],
    listId: ''
  });

  useEffect(() => {
    const loadTargets = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/hq/dispatch/targets`);
        if (!response.ok) throw new Error('לא ניתן לטעון רשימת מנהלים');
        const data = await response.json();
        setEmployees(data.employees || []);
        setLists(data.lists || []);
      } catch (err) {
        setError(err.message || 'שגיאה בטעינת יעדים');
      } finally {
        setLoading(false);
      }
    };

    loadTargets();
  }, []);

  const toggleManager = (id) => {
    setForm((prev) => {
      const exists = prev.managerIds.includes(id);
      return {
        ...prev,
        managerIds: exists
          ? prev.managerIds.filter((x) => x !== id)
          : [...prev.managerIds, id]
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);

    if (!form.title || !form.start_date || !form.start_time) {
      setError('נא למלא כותרת, תאריך ושעה');
      return;
    }

    if (form.targetMode === 'specific' && form.managerIds.length === 0) {
      setError('נא לבחור לפחות מנהל אחד');
      return;
    }

    if (form.targetMode === 'list' && !form.listId) {
      setError('נא לבחור רשימת תפוצה');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`${API_URL}/hq/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'שגיאה בשיגור משימות');

      setResult(payload);
    } catch (err) {
      setError(err.message || 'שגיאה בשיגור משימות');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">שיגור משימות</h1>
        <p className="text-gray-600 mt-1">שליחה מרוכזת לכל המנהלים או לפי בחירה</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="text-sm text-gray-700">
            כותרת משימה
            <input
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="לדוגמה: בדיקת לוחות חשמל"
            />
          </label>

          <label className="text-sm text-gray-700">
            עדיפות
            <select
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 bg-white"
              value={form.priority}
              onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))}
            >
              <option value="normal">רגיל</option>
              <option value="urgent">דחוף</option>
              <option value="optional">אופציונלי</option>
            </select>
          </label>
        </div>

        <label className="text-sm text-gray-700 block">
          תיאור
          <textarea
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 min-h-[90px]"
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="פרטים נוספים..."
          />
        </label>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="text-sm text-gray-700">
            תאריך
            <DatePicker
              selected={parseISODate(form.start_date)}
              onChange={(date) => {
                if (!date) return;
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                setForm((prev) => ({ ...prev, start_date: `${year}-${month}-${day}` }));
              }}
              dateFormat="dd/MM/yyyy"
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2"
            />
          </label>

          <label className="text-sm text-gray-700">
            שעה
            <input
              type="time"
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2"
              value={form.start_time}
              onChange={(e) => setForm((prev) => ({ ...prev, start_time: e.target.value }))}
            />
          </label>

          <label className="text-sm text-gray-700">
            אופן יעד
            <select
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 bg-white"
              value={form.targetMode}
              onChange={(e) => setForm((prev) => ({ ...prev, targetMode: e.target.value }))}
            >
              <option value="all">שלח לכולם</option>
              <option value="specific">שלח לפי בחירה</option>
              <option value="list">שלח לפי רשימה</option>
            </select>
          </label>
        </div>

        {form.targetMode === 'list' && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">בחר רשימת תפוצה</p>
            <select
              className="w-full md:w-80 border border-gray-200 rounded-lg px-3 py-2 bg-white"
              value={form.listId}
              onChange={(e) => setForm((prev) => ({ ...prev, listId: e.target.value }))}
            >
              <option value="">בחר רשימה</option>
              {lists.map((list) => (
                <option key={list.id} value={list.id}>{list.name} ({list.members_count || 0})</option>
              ))}
            </select>
          </div>
        )}

        {form.targetMode === 'specific' && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">בחר מנהלים</p>
            {loading ? (
              <div className="text-sm text-gray-500">טוען מנהלים...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {employees.map((emp) => (
                  <label key={emp.id} className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={form.managerIds.includes(emp.id)}
                      onChange={() => toggleManager(emp.id)}
                    />
                    <span className="text-sm">{emp.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        <div>
          <button
            type="submit"
            disabled={submitting}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg disabled:opacity-60"
          >
            {submitting ? 'משגר...' : 'שגר משימות'}
          </button>
        </div>
      </form>

      {result?.summary && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <h2 className="font-semibold text-emerald-800 mb-2">סיכום שיגור</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div><span className="text-gray-600">יעדים בפועל:</span> <b>{result.summary.actualTargets}</b></div>
            <div><span className="text-gray-600">משימות שנוצרו:</span> <b>{result.summary.createdTasks}</b></div>
            <div><span className="text-gray-600">נכשלו:</span> <b>{result.summary.failed}</b></div>
            <div><span className="text-gray-600">אופן:</span> <b>{result.summary.targetMode === 'all' ? 'כולם' : 'בחירה'}</b></div>
          </div>
        </div>
      )}
    </div>
  );
}
