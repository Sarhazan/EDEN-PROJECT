import { useEffect, useMemo, useRef, useState } from 'react';
import { API_URL } from '../config';
import Spinner from '../components/ui/Spinner';

const STATUS_LABELS = {
  sent: 'נשלח',
  opened: 'התקבל',
  submitted: 'הוגש',
  signed: 'נחתם'
};

const STATUS_COLORS = {
  sent: 'bg-blue-100 text-blue-700',
  opened: 'bg-yellow-100 text-yellow-700',
  submitted: 'bg-green-100 text-green-700',
  signed: 'bg-purple-100 text-purple-700'
};

export default function HQFormsPage() {
  const [items, setItems] = useState([]);
  const [dispatches, setDispatches] = useState([]);
  const [customTemplates, setCustomTemplates] = useState([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState('');
  const [contractTitle, setContractTitle] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDispatch, setSelectedDispatch] = useState(null);
  const [deliveryPreview, setDeliveryPreview] = useState(null);
  const [deliveryLogs, setDeliveryLogs] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Upload form modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadName, setUploadName] = useState('');
  const [uploadHasSignature, setUploadHasSignature] = useState(null); // null=not asked, true/false=answered
  const [uploadDragOver, setUploadDragOver] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const loadCustomTemplates = async () => {
    const res = await fetch(`${API_URL}/forms/hq/custom-templates`);
    if (!res.ok) throw new Error('שגיאה בטעינת טפסי PDF');
    const data = await res.json();
    setCustomTemplates(data.items || []);
  };

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
      await Promise.all([loadAssets(), loadDispatches(), loadCustomTemplates()]);
    } catch (e) {
      setError(e.message || 'שגיאה');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleFileDrop = (e) => {
    e.preventDefault();
    setUploadDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setUploadError('יש לבחור קובץ PDF בלבד');
      return;
    }
    setUploadFile(file);
    setUploadError('');
    if (!uploadName) setUploadName(file.name.replace(/\.pdf$/i, ''));
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setUploadError('יש לבחור קובץ PDF בלבד');
      return;
    }
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
      setUploadFile(null);
      setUploadName('');
      setUploadHasSignature(null);
      await loadCustomTemplates();
    } catch (e) {
      setUploadError(e.message || 'שגיאה בהעלאה');
    } finally {
      setUploading(false);
    }
  };

  const deleteCustomTemplate = async (id) => {
    if (!window.confirm('למחוק את הטופס?')) return;
    try {
      const res = await fetch(`${API_URL}/forms/hq/custom-templates/${id}`, { method: 'DELETE' });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'שגיאה במחיקה');
      await loadCustomTemplates();
    } catch (e) {
      setError(e.message || 'שגיאה במחיקה');
    }
  };

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

      const logsRes = await fetch(`${API_URL}/forms/hq/dispatches/${dispatchId}/delivery-logs`);
      const logsPayload = await logsRes.json();
      if (logsRes.ok) {
        setDeliveryLogs(logsPayload.items || []);
      } else {
        setDeliveryLogs([]);
      }
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

  const sendLiveToTest = async (dispatchId) => {
    try {
      setError('');
      const res = await fetch(`${API_URL}/forms/hq/dispatches/${dispatchId}/send-live`, { method: 'POST' });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'שגיאה בשליחת וואטסאפ');
      await loadDispatches();
      await openDispatch(dispatchId);
    } catch (e) {
      setError(e.message || 'שגיאה בשליחה');
    }
  };

  const selected = items.find((x) => String(x.buildingId) === String(selectedBuildingId));

  const filteredDispatches = useMemo(() => {
    if (statusFilter === 'all') return dispatches;
    return dispatches.filter((d) => d.status === statusFilter);
  }, [dispatches, statusFilter]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">טפסים - מנהל אזור</h1>
          <p className="text-gray-600 mt-1">ניהול נכסי טפסים + מעקב סטטוסי שליחה ומילוי</p>
        </div>
        <button
          onClick={() => { setShowUploadModal(true); setUploadError(''); setUploadFile(null); setUploadName(''); setUploadHasSignature(null); }}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-medium whitespace-nowrap"
        >
          <span>📄</span> טען טופס
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3">{error}</div>}

      {/* Upload Form Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5" dir="rtl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">טען טופס PDF</h2>
              <button onClick={() => setShowUploadModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>

            {/* Drop zone */}
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

            {/* Form name */}
            <label className="block text-sm">
              <span className="font-medium text-gray-700">שם הטופס <span className="text-red-500">*</span></span>
              <input
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                placeholder="לדוג׳: נוהל שימוש בחדר דיירים"
              />
            </label>

            {/* Signature question — appears after file is selected */}
            {uploadFile && (
              <div className="border border-amber-200 bg-amber-50 rounded-xl p-4 space-y-3">
                <p className="font-medium text-amber-800">האם להוסיף שדה חתימה לטופס?</p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setUploadHasSignature(true)}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      uploadHasSignature === true ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400'
                    }`}
                  >
                    ✅ כן, עם חתימה
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadHasSignature(false)}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      uploadHasSignature === false ? 'bg-gray-600 text-white border-gray-600' : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    ➡️ לא, ללא חתימה
                  </button>
                </div>
                {uploadHasSignature === true && (
                  <p className="text-xs text-indigo-700">הטופס ישלח עם שדה חתימה — הנמען יצטרך לחתום לפני שהטופס יסתמן כ"נחתם"</p>
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

      {/* Custom PDF Templates Section */}
      <section className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">טפסי PDF שהועלו</h2>
          <span className="text-sm text-gray-400">{customTemplates.length} טפסים</span>
        </div>
        {customTemplates.length === 0 ? (
          <div className="text-gray-500 text-sm py-2">אין טפסי PDF עדיין — לחץ "טען טופס" להוספה</div>
        ) : (
          <div className="space-y-2">
            {customTemplates.map((t) => (
              <div key={t.id} className="flex items-center justify-between border border-gray-200 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📄</span>
                  <div>
                    <div className="font-medium">{t.name}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                      {t.has_signature ? <span className="text-purple-600">✍️ עם חתימה</span> : <span>ללא חתימה</span>}
                      <span>• {new Date(t.created_at).toLocaleDateString('he-IL')}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a href={t.file_path} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline">צפה</a>
                  <button onClick={() => deleteCustomTemplate(t.id)} className="text-xs text-red-500 hover:text-red-700">מחק</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

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
            <div className="flex items-center gap-2 text-gray-500 py-2"><Spinner size="sm" />טוען...</div>
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
            <option value="opened">התקבל</option>
            <option value="submitted">הוגש</option>
            <option value="signed">נחתם</option>
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
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">#{d.id} • {d.template_key.startsWith('custom_pdf_') ? '📄 ' : ''}{d.recipient_name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[d.status] || 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABELS[d.status] || d.status}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  {d.building_name || '-'} | נוצר: {new Date(d.created_at).toLocaleDateString('he-IL')}
                  {d.opened_at ? ` | התקבל` : ''}
                  {d.submitted_at ? ` | הוגש` : ''}
                  {d.signed_at ? ` | נחתם ✍️` : ''}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {selectedDispatch && (
        <section className="bg-white rounded-xl border border-indigo-200 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">פרטי טופס #{selectedDispatch.id}</h2>
            <div className="flex items-center gap-2">
              <button
                className="text-sm bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded"
                onClick={() => sendLiveToTest(selectedDispatch.id)}
              >
                שלח LIVE (TEST)
              </button>
              <button className="text-sm text-gray-500" onClick={() => { setSelectedDispatch(null); setDeliveryLogs([]); setDeliveryPreview(null); }}>סגור</button>
            </div>
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

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="font-semibold mb-2">לוג משלוחים</div>
            {deliveryLogs.length === 0 ? (
              <div className="text-sm text-gray-500">אין לוגים עדיין</div>
            ) : (
              <div className="space-y-1">
                {deliveryLogs.map((log) => (
                  <div key={log.id} className="text-xs text-gray-700 border border-gray-200 rounded p-2 bg-white">
                    {log.created_at} | {log.channel} | {log.mode} | {log.status}
                    {log.error ? ` | error: ${log.error}` : ''}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
