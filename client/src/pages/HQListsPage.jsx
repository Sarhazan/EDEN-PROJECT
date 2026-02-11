import { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL
  : 'http://localhost:3002/api';

export default function HQListsPage() {
  const [employees, setEmployees] = useState([]);
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [memberIds, setMemberIds] = useState([]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [targetsRes, listsRes] = await Promise.all([
        fetch(`${API_URL}/hq/dispatch/targets`),
        fetch(`${API_URL}/hq/lists`)
      ]);

      if (!targetsRes.ok || !listsRes.ok) {
        throw new Error('שגיאה בטעינת רשימות תפוצה');
      }

      const targetsData = await targetsRes.json();
      const listsData = await listsRes.json();

      setEmployees(targetsData.employees || []);
      setLists(listsData.lists || []);
    } catch (err) {
      setError(err.message || 'שגיאה בטעינת נתונים');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleMember = (id) => {
    setMemberIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const createList = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('נא להזין שם רשימה');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/hq/lists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), memberIds })
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'שגיאה ביצירת רשימה');

      setName('');
      setMemberIds([]);
      await loadData();
    } catch (err) {
      setError(err.message || 'שגיאה ביצירת רשימה');
    }
  };

  const deleteList = async (id) => {
    if (!confirm('למחוק את הרשימה?')) return;

    try {
      const res = await fetch(`${API_URL}/hq/lists/${id}`, { method: 'DELETE' });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'שגיאה במחיקה');
      await loadData();
    } catch (err) {
      setError(err.message || 'שגיאה במחיקה');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">רשימות תפוצה</h1>
        <p className="text-gray-600 mt-1">ניהול קבוצות מנהלים לשיגור מהיר</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3">{error}</div>
      )}

      <form onSubmit={createList} className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
        <h2 className="text-lg font-semibold">רשימה חדשה</h2>
        <label className="text-sm text-gray-700 block">
          שם רשימה
          <input
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="לדוגמה: מנהלי בת ים"
          />
        </label>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">בחר מנהלים</p>
          {loading ? (
            <div className="text-sm text-gray-500">טוען...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {employees.map((emp) => (
                <label key={emp.id} className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={memberIds.includes(emp.id)}
                    onChange={() => toggleMember(emp.id)}
                  />
                  <span className="text-sm">{emp.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg">
          צור רשימה
        </button>
      </form>

      <section className="bg-white border border-gray-100 rounded-xl p-5">
        <h2 className="text-lg font-semibold mb-3">רשימות קיימות</h2>

        {lists.length === 0 ? (
          <div className="text-gray-500">אין עדיין רשימות תפוצה.</div>
        ) : (
          <div className="space-y-3">
            {lists.map((list) => (
              <div key={list.id} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold">{list.name}</div>
                    <div className="text-sm text-gray-600">{list.members_count || 0} חברים</div>
                  </div>
                  <button
                    onClick={() => deleteList(list.id)}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    מחק
                  </button>
                </div>
                {Array.isArray(list.members) && list.members.length > 0 && (
                  <div className="mt-2 text-sm text-gray-600">
                    {list.members.map((m) => m.name).join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
