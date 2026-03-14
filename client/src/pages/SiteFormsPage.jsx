import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { API_URL } from '../config';

const STATUS_LABELS = { sent: 'נשלח', opened: 'התקבל', submitted: 'הוגש', signed: 'נחתם' };
const STATUS_COLORS = {
  sent: 'bg-blue-100 text-blue-700',
  opened: 'bg-yellow-100 text-yellow-700',
  submitted: 'bg-green-100 text-green-700',
  signed: 'bg-purple-100 text-purple-700'
};

export default function SiteFormsPage() {
  const { buildings } = useApp();
  const [templates, setTemplates] = useState([]);
  const [history, setHistory] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Upload modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadName, setUploadName] = useState('');
  const [uploadHasSignature, setUploadHasSignature] = useState(null);
  const [uploadDragOver, setUploadDragOver] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
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

  const handleFileDrop = (e) => {
    e.preventDefault();
    setUploadDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) { setUploadError('יש לבחור קובץ PDF בלבד'); return; }
    setUploadFile(file);
    setUploadError('');
    if (!uploadName) setUploadName(file.name.replace(/\.pdf$/i, ''));
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) { setUploadError('יש לבחור קובץ PDF בלבד'); return; }
    setUploadFile(file);
    setUploadError('');
    if (!uploadName) setUploadName(file.name.replace(/\.pdf$/i, ''));
  };

  const submitUpload = async () => {
    if (!uploadFile) return setUploadError('נא לבחור קובץ PDF');
    if (!uploadName.trim()) return setUploadError('נא לתת שם לטופס');
    if (uploadHasSignature === null) return setUploadError('נא לענות על שאלת החתימה');
    setUploading(true);
    setUploadError('');
    try {
      const fd = new FormData();
      fd.append('file', uploadFile);
      fd.append('name', uploadName.trim());
      fd.append('has_signature', uploadHasSignature ? '1' : '0');
      fd.append('mode', 'pdf_template');
      const res = await fetch(`${API_URL}/forms/hq/custom-templates`, { method: 'POST', body: fd });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'שגיאה בהעלאה');
      setShowUploadModal(false);
      setUploadFile(null); setUploadName(''); setUploadHasSignature(null);
      await load();
    } catch (e) {
      setUploadError(e.message || 'שגיאה בהעלאה');
    } finally {
      setUploading(false);
    }
  };

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
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">טפסים - מנהל אחזקה</h1>
          <p className="text-gray-600 mt-1">שליחת טפסים אינטראקטיביים לספקים ולדיירים</p>
        </div>
        <button
          onClick={() => { setShowUploadModal(true); setUploadError(''); setUploadFile(null); setUploadName(''); setUploadHasSignature(null); }}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-medium whitespace-nowrap"
        >
          <span>📄</span> טען טופס
        </button>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5" dir="rtl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">טען טופס PDF</h2>
              <button onClick={() => setShowUploadModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>

            <div
              onDragOver={(e) => { e.preventDefault(); setUploadDragOver(true); }}
              onDragLeave={() => setUploadDragOver(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                uploadDragOver ? 'border-indigo-500 bg-indigo-50' : uploadFile ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-indigo-400 bg-gray-50'
              }`}
            >
              <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileSelect} />
              {uploadFile ? (
                <div className="space-y-1">
                  <div className="text-3xl">📄</div>
                  <div className="font-semibold text-green-700">{uploadFile.name}</div>
                  <div className="text-xs text-gray-500">{(uploadFile.size / 1024).toFixed(0)} KB • לחץ להחלפה</div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-4xl text-gray-400">⬆️</div>
                  <div className="font-medium text-gray-600">גרור קובץ PDF לכאן</div>
                  <div className="text-sm text-gray-400">או לחץ לבחירה מהמחשב</div>
                </div>
              )}
            </div>

            <label className="block text-sm">
              <span className="font-medium text-gray-700">שם הטופס <span className="text-red-500">*</span></span>
              <input
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                placeholder="לדוג׳: נוהל שימוש בחדר דיירים"
              />
            </label>

            {uploadFile && (
              <div className="border border-amber-200 bg-amber-50 rounded-xl p-4 space-y-3">
                <p className="font-medium text-amber-800">האם להוסיף שדה חתימה לטופס?</p>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setUploadHasSignature(true)}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${uploadHasSignature === true ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400'}`}>
                    ✅ כן, עם חתימה
                  </button>
                  <button type="button" onClick={() => setUploadHasSignature(false)}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${uploadHasSignature === false ? 'bg-gray-600 text-white border-gray-600' : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'}`}>
                    ➡️ לא, ללא חתימה
                  </button>
                </div>
                {uploadHasSignature === true && (
                  <p className="text-xs text-indigo-700">הנמען יצטרך לחתום לפני שהטופס יסתמן כ"נחתם"</p>
                )}
              </div>
            )}

            {uploadError && <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{uploadError}</div>}

            <div className="flex gap-3 pt-1">
              <button
                onClick={submitUpload}
                disabled={uploading || !uploadFile || !uploadName.trim() || uploadHasSignature === null}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white py-2.5 rounded-lg font-medium transition-colors"
              >
                {uploading ? 'מעלה...' : 'שמור טופס'}
              </button>
              <button onClick={() => setShowUploadModal(false)} className="px-4 py-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

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
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{h.recipient_name} • {h.template_key.startsWith('custom_pdf_') ? '📄 ' : ''}{h.template_key.startsWith('custom_pdf_') ? 'PDF' : h.template_key}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[h.status] || 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABELS[h.status] || h.status}
                  </span>
                </div>
                <div className="text-sm text-gray-500">{h.building_name || '-'} | {h.recipient_contact || '-'}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
