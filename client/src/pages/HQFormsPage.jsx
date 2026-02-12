import { useEffect, useMemo, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL
  : 'http://localhost:3002/api';

export default function HQFormsPage() {
  const [items, setItems] = useState([]);
  const [dispatches, setDispatches] = useState([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState('');
  const [contractTitle, setContractTitle] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDispatch, setSelectedDispatch] = useState(null);
  const [deliveryPreview, setDeliveryPreview] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadAssets = async () => {
    const res = await fetch(`${API_URL}/forms/hq/buildings-assets`);
    if (!res.ok) throw new Error('שגיאה בטעינת נכסי טפסים');
    const data = await res.json();
    setItems(data.items || []);
    if (!selectedBuildingId && (data.items || []).length > 0) {
      setSelectedBuildingId(String(data.items[0].buildingId));
    }
  };

  const loadDispatches = async () => {
    const res = await fetch(`${API_URL}/forms/hq/dispatches`);
    if (!res.ok) throw new Error('שגיאה בטעינת היסטוריית טפסים');
    const data = await res.json();
    setDispatches(data.items || []);
  };

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      await Promise.all([loadAssets(), loadDispatches()]);
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
      await loadAssets();
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
      await loadAssets();
    } catch (e) {
      setError(e.message || 'שגיאה בהעלאת חוזה');
    }
  };

  const deleteContract = async (id) => {
    try {
      const res = await fetch(`${API_URL}/forms/hq/contracts/${id}`, { method: 'DELETE' });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'שגיאה במחיקה');
      await loadAssets();
    } catch (e) {
      setError(e.message || 'שגיאה במחיקה');
    }
  };

  const openDispatch = async (dispatchId) => {
    try {
      const res = await fetch(`${API_URL}/forms/hq/dispatches/${dispatchId}`);
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'שגיאה בטעינת טופס');
      setSelectedDispatch(payload.item || null);
      setDeliveryPreview(null);
    } catch (e) {
      setError(e.message || 'שגיאה בטעינת פרטי טופס');
    }
  };

  const loadDeliveryPreview = async (dispatchId) => {
    try {
      const res = await fetch(`${API_URL}/forms/hq/dispatches/${dispatchId}/delivery-preview`);
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'שגיאה בטעינת תצוגת משלוח');
      setDeliveryPreview(payload.item || null);
    } catch (e) {
      setError(e.message || 'שגיאה בטעינת תצוגת משלוח');
    }
  };

  const selected = items.find((x) => String(x.buildingId) === String(selectedBuildingId));

  const filteredDispatches = useMemo(() => {
    if (statusFilter === 'all') return dispatches;
    return dispatches.filter((d) => d.status === statusFilter);
  }, [dispatches, statusFilter]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">טפסים - מנהל אזור</h1>
        <p className="text-gray-600 mt-1">ניהול נכסי טפסים + מעקב סטטוסי שליחה ומילוי</p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3">{error}</div>}

      <section className="bg-white rounded-xl border border-gray-100 p-4 space-y-4">
        <h2 className="font-semibold">מיתוג וחוזים לפי מתחם</h2>
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
            <h3 className="font-semibold">לוגו מתחם</h3>
            {selected?.logoPath ? (
              <img src={selected.logoPath} alt="logo" className="h-24 object-contain bg-gray-50 rounded border border-gray-100" />
            ) : (
              <div className="text-sm text-gray-500">אין לוגו מוגדר</div>
            )}
            <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
          </div>

          <div className="border border-gray-200 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold">חוזים למסמכים</h3>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2"
              value={contractTitle}
              onChange={(e) => setContractTitle(e.target.value)}
              placeholder="כותרת חוזה"
            />
            <input type="file" onChange={(e) => e.target.files?.[0] && uploadContract(e.target.files[0])} />
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-3">חוזים קיימים במתחם</h3>
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
        </div>
      </section>

      <section className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <h2 className="font-semibold">מעקב טפסים (HQ)</h2>
          <select
            className="w-full md:w-56 border border-gray-200 rounded-lg px-3 py-2 bg-white"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">כל הסטטוסים</option>
            <option value="sent">נשלח</option>
            <option value="opened">נפתח</option>
            <option value="submitted">נשלח חזרה</option>
          </select>
        </div>

        {filteredDispatches.length === 0 ? (
          <div className="text-gray-500">אין טפסים להצגה</div>
        ) : (
          <div className="space-y-2">
            {filteredDispatches.map((d) => (
              <button
                key={d.id}
                onClick={() => openDispatch(d.id)}
                className="w-full text-right border border-gray-200 rounded-lg p-3 hover:bg-gray-50"
              >
                <div className="font-medium">#{d.id} • {d.template_key} • {d.recipient_name}</div>
                <div className="text-sm text-gray-600">
                  {d.status} | משלוח: {d.delivery_status || '-'} | {d.building_name || '-'} | נוצר: {d.created_at}
                  {d.opened_at ? ` | נפתח: ${d.opened_at}` : ''}
                  {d.submitted_at ? ` | הוגש: ${d.submitted_at}` : ''}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {selectedDispatch && (
        <section className="bg-white rounded-xl border border-indigo-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">פרטי טופס #{selectedDispatch.id}</h2>
            <button className="text-sm text-gray-500" onClick={() => setSelectedDispatch(null)}>סגור</button>
          </div>

          <div className="text-sm text-gray-700 space-y-1">
            <div><span className="font-semibold">סוג טופס:</span> {selectedDispatch.template_key}</div>
            <div><span className="font-semibold">נמען:</span> {selectedDispatch.recipient_name}</div>
            <div><span className="font-semibold">סטטוס:</span> {selectedDispatch.status}</div>
            <div><span className="font-semibold">סטטוס משלוח:</span> {selectedDispatch.delivery_status || '-'}</div>
            <div><span className="font-semibold">ערוץ:</span> {selectedDispatch.delivery_channel || '-'}</div>
            <div><span className="font-semibold">מצב משלוח:</span> {selectedDispatch.delivery_mode || '-'}</div>
            <div><span className="font-semibold">מבנה:</span> {selectedDispatch.building_name || '-'}</div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="font-semibold mb-2">Payload</div>
            <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(selectedDispatch.payload || {}, null, 2)}</pre>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-semibold">תצוגת הודעת משלוח (ללא שליחה)</div>
              <button
                className="text-sm text-indigo-700"
                onClick={() => loadDeliveryPreview(selectedDispatch.id)}
              >
                טען תצוגה
              </button>
            </div>
            {deliveryPreview ? (
              <pre className="text-xs whitespace-pre-wrap">{deliveryPreview.previewMessage}</pre>
            ) : (
              <div className="text-sm text-gray-500">לחץ "טען תצוגה" כדי לראות את ההודעה כפי שתישלח בעתיד.</div>
            )}
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="font-semibold mb-1">תשובות</div>
            {selectedDispatch.submission ? (
              <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(selectedDispatch.submission.answers || {}, null, 2)}</pre>
            ) : (
              <div className="text-sm text-gray-500">עדיין אין הגשה</div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
