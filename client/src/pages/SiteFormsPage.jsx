import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';

const API_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL
  : 'http://localhost:3002/api';

export default function SiteFormsPage() {
  const { buildings } = useApp();
  const [templates, setTemplates] = useState([]);
  const [history, setHistory] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    templateKey: '',
    recipientType: 'tenant',
    buildingId: '',
    recipientId: '',
    recipientName: '',
    recipientContact: '',
    title: '',
    message: '',
    amount: '',
    deliveryMode: 'manual'
  });

  const load = async () => {
    try {
      const [tRes, hRes] = await Promise.all([
        fetch(`${API_URL}/forms/site/templates`),
        fetch(`${API_URL}/forms/site/dispatches`)
      ]);
      if (!tRes.ok || !hRes.ok) throw new Error('שגיאה בטעינת טפסים');
      const tData = await tRes.json();
      const hData = await hRes.json();
      setTemplates(tData.templates || []);
      setHistory(hData.items || []);
      if (!form.templateKey && (tData.templates || []).length > 0) {
        setForm((p) => ({ ...p, templateKey: tData.templates[0].key }));
      }
    } catch (e) {
      setError(e.message || 'שגיאה');
    }
  };

  const loadRecipients = async (type, buildingId) => {
    try {
      const params = new URLSearchParams({ type });
      if (type === 'tenant' && buildingId) params.set('buildingId', buildingId);

      if (type === 'tenant' && !buildingId) {
        setRecipients([]);
        return;
      }

      const res = await fetch(`${API_URL}/forms/site/recipients?${params.toString()}`);
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'שגיאה בטעינת נמענים');
      setRecipients(payload.items || []);
    } catch (e) {
      setRecipients([]);
      setError(e.message || 'שגיאה בטעינת נמענים');
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (form.recipientType === 'tenant' && !form.buildingId && buildings.length > 0) {
      // UX: auto-select a building so tenants dropdown is populated immediately
      setForm((p) => ({ ...p, buildingId: String(buildings[0].id) }));
      return;
    }

    loadRecipients(form.recipientType, form.buildingId);
  }, [form.recipientType, form.buildingId, buildings]);

  const selectedRecipient = useMemo(() => {
    if (!form.recipientId) return null;
    return recipients.find((r) => String(r.id) === String(form.recipientId)) || null;
  }, [form.recipientId, recipients]);

  useEffect(() => {
    if (!selectedRecipient) return;

    if (form.recipientType === 'tenant') {
      setForm((p) => ({
        ...p,
        recipientName: selectedRecipient.name || '',
        recipientContact: selectedRecipient.phone || selectedRecipient.email || ''
      }));
      return;
    }

    setForm((p) => ({
      ...p,
      recipientName: selectedRecipient.name || '',
      recipientContact: selectedRecipient.phone || selectedRecipient.email || ''
    }));
  }, [selectedRecipient, form.recipientType]);

  const send = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (!form.templateKey) throw new Error('נא לבחור טופס');
      if (form.recipientType === 'tenant' && !form.buildingId) throw new Error('נא לבחור מבנה לדייר');
      if (!form.recipientName.trim()) throw new Error('נא להזין שם נמען');

      const res = await fetch(`${API_URL}/forms/site/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'שגיאה בשליחה');

      const deliveryLine = payload?.delivery
        ? ` | משלוח: ${payload.delivery.status}${payload.delivery.error ? ` (${payload.delivery.error})` : ''}`
        : '';
      setSuccess(`נשלח בהצלחה. קישור אינטראקטיבי: ${payload.formUrl}${deliveryLine}`);
      setForm((p) => ({ ...p, recipientId: '', recipientName: '', recipientContact: '', title: '', message: '', amount: '' }));
      await load();
    } catch (e2) {
      setError(e2.message || 'שגיאה בשליחה');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">טפסים - מנהל אחזקה</h1>
        <p className="text-gray-600 mt-1">שליחת טפסים אינטראקטיביים לספקים ולדיירים</p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3">{success}</div>}

      <form onSubmit={send} className="bg-white rounded-xl border border-gray-100 p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="text-sm">סוג טופס
          <select className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 bg-white" value={form.templateKey} onChange={(e) => setForm((p) => ({ ...p, templateKey: e.target.value }))}>
            {templates.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
        </label>

        <label className="text-sm">סוג נמען
          <select
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 bg-white"
            value={form.recipientType}
            onChange={(e) => setForm((p) => ({ ...p, recipientType: e.target.value, recipientId: '', recipientName: '', recipientContact: '' }))}
          >
            <option value="tenant">דייר</option>
            <option value="supplier">ספק</option>
          </select>
        </label>

        <label className="text-sm">מבנה (לדייר)
          <select
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 bg-white"
            value={form.buildingId}
            onChange={(e) => setForm((p) => ({ ...p, buildingId: e.target.value, recipientId: '', recipientName: '', recipientContact: '' }))}
            disabled={form.recipientType !== 'tenant'}
          >
            <option value="">בחר מבנה</option>
            {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </label>

        <label className="text-sm">נמען מרשימה
          <select
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 bg-white"
            value={form.recipientId}
            onChange={(e) => setForm((p) => ({ ...p, recipientId: e.target.value }))}
          >
            <option value="">בחר נמען</option>
            {recipients.map((r) => (
              <option key={r.id} value={r.id}>
                {form.recipientType === 'tenant'
                  ? `${r.name} • קומה ${r.floor || '-'} • דירה ${r.apartment_number || '-'}`
                  : r.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">שם נמען
          <input className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2" value={form.recipientName} onChange={(e) => setForm((p) => ({ ...p, recipientName: e.target.value }))} placeholder="אפשר לבחור מרשימה או להקליד ידנית" />
        </label>

        <label className="text-sm">טלפון/אימייל
          <input className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2" value={form.recipientContact} onChange={(e) => setForm((p) => ({ ...p, recipientContact: e.target.value }))} />
        </label>

        <label className="text-sm">כותרת
          <input className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
        </label>

        <label className="text-sm">סכום (לתשלום חוב)
          <input className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} />
        </label>

        <label className="text-sm md:col-span-2">הודעה
          <textarea className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2" rows={3} value={form.message} onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))} />
        </label>

        <label className="text-sm md:col-span-2">מצב שליחה
          <select
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 bg-white"
            value={form.deliveryMode}
            onChange={(e) => setForm((p) => ({ ...p, deliveryMode: e.target.value }))}
          >
            <option value="manual">ידני (ללא שליחת וואטסאפ)</option>
            <option value="live">LIVE TEST (נשלח רק למספר מורשה)</option>
          </select>
        </label>

        <div className="md:col-span-2">
          <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg">שלח טופס</button>
        </div>
      </form>

      <section className="bg-white rounded-xl border border-gray-100 p-4">
        <h2 className="font-semibold mb-3">שליחות אחרונות</h2>
        {history.length === 0 ? (
          <div className="text-gray-500">אין שליחות עדיין</div>
        ) : (
          <div className="space-y-2">
            {history.map((h) => (
              <div key={h.id} className="border border-gray-200 rounded-lg p-3">
                <div className="font-medium">{h.recipient_name} • {h.template_key}</div>
                <div className="text-sm text-gray-600">{h.recipient_type} | {h.building_name || '-'} | {h.recipient_contact || '-'} | {h.status} | delivery: {h.delivery_status || '-'}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
