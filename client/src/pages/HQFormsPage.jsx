import { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL
  : 'http://localhost:3002/api';

export default function HQFormsPage() {
  const [items, setItems] = useState([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState('');
  const [contractTitle, setContractTitle] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/forms/hq/buildings-assets`);
      if (!res.ok) throw new Error('שגיאה בטעינת נתונים');
      const data = await res.json();
      setItems(data.items || []);
      if (!selectedBuildingId && (data.items || []).length > 0) {
        setSelectedBuildingId(String(data.items[0].buildingId));
      }
    } catch (e) {
      setError(e.message || 'שגיאה');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const uploadLogo = async (file) => {
    try {
      if (!selectedBuildingId) throw new Error('נא לבחור מתחם');
      const fd = new FormData();
      fd.append('file', file);
      fd.append('mode', 'logo');

      const res = await fetch(`${API_URL}/forms/hq/buildings/${selectedBuildingId}/logo`, {
        method: 'POST',
        body: fd
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'שגיאה בהעלאת לוגו');
      await load();
    } catch (e) {
      setError(e.message || 'שגיאה בהעלאת לוגו');
    }
  };

  const uploadContract = async (file) => {
    try {
      if (!selectedBuildingId) throw new Error('נא לבחור מתחם');
      if (!contractTitle.trim()) throw new Error('נא להזין כותרת חוזה');

      const fd = new FormData();
      fd.append('file', file);
      fd.append('title', contractTitle.trim());

      const res = await fetch(`${API_URL}/forms/hq/buildings/${selectedBuildingId}/contracts`, {
        method: 'POST',
        body: fd
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'שגיאה בהעלאת חוזה');

      setContractTitle('');
      await load();
    } catch (e) {
      setError(e.message || 'שגיאה בהעלאת חוזה');
    }
  };

  const deleteContract = async (id) => {
    try {
      const res = await fetch(`${API_URL}/forms/hq/contracts/${id}`, { method: 'DELETE' });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'שגיאה במחיקה');
      await load();
    } catch (e) {
      setError(e.message || 'שגיאה במחיקה');
    }
  };

  const selected = items.find((x) => String(x.buildingId) === String(selectedBuildingId));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">טפסים - מנהל אזור</h1>
        <p className="text-gray-600 mt-1">ניהול לוגו וחוזים לכל מתחם</p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3">{error}</div>}

      <section className="bg-white rounded-xl border border-gray-100 p-4 space-y-4">
        <label className="text-sm text-gray-700 block">
          בחר מתחם
          <select
            className="mt-1 w-full md:w-96 border border-gray-200 rounded-lg px-3 py-2 bg-white"
            value={selectedBuildingId}
            onChange={(e) => setSelectedBuildingId(e.target.value)}
          >
            <option value="">בחר מתחם</option>
            {items.map((b) => <option key={b.buildingId} value={b.buildingId}>{b.buildingName}</option>)}
          </select>
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-gray-200 rounded-lg p-4 space-y-3">
            <h2 className="font-semibold">לוגו מתחם</h2>
            {selected?.logoPath ? (
              <img src={selected.logoPath} alt="logo" className="h-24 object-contain bg-gray-50 rounded border border-gray-100" />
            ) : (
              <div className="text-sm text-gray-500">אין לוגו מוגדר</div>
            )}
            <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
          </div>

          <div className="border border-gray-200 rounded-lg p-4 space-y-3">
            <h2 className="font-semibold">חוזים למסמכים</h2>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2"
              value={contractTitle}
              onChange={(e) => setContractTitle(e.target.value)}
              placeholder="כותרת חוזה"
            />
            <input type="file" onChange={(e) => e.target.files?.[0] && uploadContract(e.target.files[0])} />
          </div>
        </div>
      </section>

      <section className="bg-white rounded-xl border border-gray-100 p-4">
        <h2 className="font-semibold mb-3">חוזים קיימים במתחם</h2>
        {loading ? (
          <div className="text-gray-500">טוען...</div>
        ) : !selected || !selected.contracts || selected.contracts.length === 0 ? (
          <div className="text-gray-500">אין חוזים למתחם זה</div>
        ) : (
          <div className="space-y-2">
            {selected.contracts.map((c) => (
              <div key={c.id} className="flex items-center justify-between border border-gray-200 rounded-lg p-3">
                <a href={c.file_path} target="_blank" rel="noreferrer" className="text-indigo-700 hover:underline">{c.title}</a>
                <button onClick={() => deleteContract(c.id)} className="text-red-600 text-sm">מחק</button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
