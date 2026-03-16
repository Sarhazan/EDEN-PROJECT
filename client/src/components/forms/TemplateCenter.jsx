import { useEffect, useMemo, useRef, useState } from 'react';
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { API_URL } from '../../config';
import { useApp } from '../../context/AppContext';

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const DEFAULT_SIGNATURE_BOX = { x: 0.62, y: 0.78, width: 0.28, height: 0.12 };
const clamp01 = (value) => Math.min(1, Math.max(0, value));

const STATUS_LABELS = { sent: 'נשלח', opened: 'נפתח', submitted: 'הוגש', signed: 'נחתם' };
const STATUS_COLORS = {
  sent: 'bg-blue-100 text-blue-700',
  opened: 'bg-yellow-100 text-yellow-700',
  submitted: 'bg-green-100 text-green-700',
  signed: 'bg-purple-100 text-purple-700'
};

export default function TemplateCenter({ title = 'מרכז תבניות', subtitle = 'בחר תבנית ושלח בלחיצה' }) {
  const { buildings } = useApp();
  const [templates, setTemplates] = useState([]);
  const [pendingSignature, setPendingSignature] = useState([]);
  const [sentToday, setSentToday] = useState([]);
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [recipients, setRecipients] = useState([]);

  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [sendOpen, setSendOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [editForm, setEditForm] = useState({ displayName: '', templateText: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState(null);
  const [deletingTemplate, setDeletingTemplate] = useState(false);

  const [form, setForm] = useState({
    recipientType: 'tenant',
    buildingId: '',
    recipientId: '',
    recipientName: '',
    recipientContact: '',
    title: '',
    message: '',
    amount: '',
    deliveryMode: 'live'
  });

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadName, setUploadName] = useState('');
  const [uploadHasSignature, setUploadHasSignature] = useState(null);
  const [uploadDragOver, setUploadDragOver] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [signaturePlacement, setSignaturePlacement] = useState({ page: 1, x: '', y: '', width: '', height: '' });
  const [signaturePlacementSaved, setSignaturePlacementSaved] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pdfPageCount, setPdfPageCount] = useState(0);
  const [pdfCurrentPage, setPdfCurrentPage] = useState(1);
  const [pdfPageSize, setPdfPageSize] = useState({ width: 0, height: 0 });
  const [pdfRenderSize, setPdfRenderSize] = useState({ width: 0, height: 0 });
  const [signatureBox, setSignatureBox] = useState(null);
  const [dragMode, setDragMode] = useState(null);
  const dragStateRef = useRef(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const fileInputRef = useRef(null);
  const pdfCanvasRef = useRef(null);
  const pdfWrapperRef = useRef(null);

  const load = async () => {
    setError('');
    try {
      const [tRes, pRes, sRes, hRes] = await Promise.all([
        fetch(`${API_URL}/forms/site/templates`),
        fetch(`${API_URL}/forms/site/dispatches/pending-signature`),
        fetch(`${API_URL}/forms/site/dispatches/sent-today`),
        fetch(`${API_URL}/forms/site/dispatches/history?limit=100&page=1`)
      ]);
      const [tData, pData, sData, hData] = await Promise.all([tRes.json(), pRes.json(), sRes.json(), hRes.json()]);
      if (!tRes.ok || !pRes.ok || !sRes.ok || !hRes.ok) throw new Error(tData.error || pData.error || sData.error || hData.error || 'שגיאה בטעינת מרכז התבניות');
      setTemplates(tData.templates || []);
      setPendingSignature(pData.items || []);
      setSentToday(sData.items || []);
      setHistory(hData.items || []);
    } catch (e) {
      setError(e.message || 'שגיאה בטעינת טפסים');
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const fetchRecipients = async () => {
      try {
        if (form.recipientType === 'tenant' && !form.buildingId) {
          setRecipients([]);
          return;
        }

        const params = new URLSearchParams({ type: form.recipientType });
        if (form.recipientType === 'tenant') params.set('buildingId', form.buildingId);

        const res = await fetch(`${API_URL}/forms/site/recipients?${params.toString()}`);
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error || 'שגיאה בטעינת נמענים');
        setRecipients(payload.items || []);
      } catch (e) {
        setRecipients([]);
        setError(e.message || 'שגיאה בטעינת נמענים');
      }
    };

    fetchRecipients();
  }, [form.recipientType, form.buildingId]);

  const selectedRecipient = useMemo(() => recipients.find((r) => String(r.id) === String(form.recipientId)) || null, [recipients, form.recipientId]);
  useEffect(() => {
    if (!selectedRecipient) return;
    setForm((p) => ({
      ...p,
      recipientName: selectedRecipient.name || '',
      recipientContact: selectedRecipient.phone || selectedRecipient.email || ''
    }));
  }, [selectedRecipient]);

  const openSend = (template) => {
    setSelectedTemplate(template);
    setForm((p) => ({
      ...p,
      recipientId: '',
      recipientName: '',
      recipientContact: '',
      title: '',
      message: template.template_text || '',
      amount: ''
    }));
    setSendOpen(true);
    setError('');
    setSuccess('');
  };

  const openEditTemplate = (template) => {
    setEditingTemplate(template);
    setEditForm({
      displayName: template.label || '',
      templateText: template.template_text || ''
    });
    setEditOpen(true);
    setError('');
  };

  const saveTemplateEdit = async (e) => {
    e.preventDefault();
    if (!editingTemplate) return;

    setSavingEdit(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/forms/site/templates/${encodeURIComponent(editingTemplate.key)}/metadata`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: editForm.displayName,
          templateText: editForm.templateText
        })
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'שגיאה בשמירת תבנית');

      setEditOpen(false);
      setEditingTemplate(null);
      setSuccess('התבנית נשמרה בהצלחה');
      await load();
    } catch (e2) {
      setError(e2.message || 'שגיאה בשמירת תבנית');
    } finally {
      setSavingEdit(false);
    }
  };

  const openDeleteTemplate = (template) => {
    setTemplateToDelete(template);
    setDeleteOpen(true);
    setError('');
    setSuccess('');
  };

  const confirmDeleteTemplate = async () => {
    if (!templateToDelete) return;
    setDeletingTemplate(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/forms/site/templates/${encodeURIComponent(templateToDelete.key)}`, {
        method: 'DELETE'
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'שגיאה במחיקת תבנית');

      setDeleteOpen(false);
      setTemplateToDelete(null);
      setSuccess('התבנית נמחקה בהצלחה');
      await load();
    } catch (e) {
      setError(e.message || 'שגיאה במחיקת תבנית');
    } finally {
      setDeletingTemplate(false);
    }
  };

  const send = async (e) => {
    e.preventDefault();
    if (!selectedTemplate) return;
    setError('');
    setSuccess('');

    try {
      const payload = { ...form, templateKey: selectedTemplate.key, templateText: form.message };
      if (!payload.recipientName?.trim()) throw new Error('נא לבחור/להזין נמען');
      if (payload.recipientType === 'tenant' && !payload.buildingId) throw new Error('נא לבחור מבנה לפני בחירת דייר');

      const res = await fetch(`${API_URL}/forms/site/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'שגיאה בשליחה');
      setSuccess(`נשלח בהצלחה: ${data.formUrl}`);
      setSendOpen(false);
      await load();
    } catch (e2) {
      setError(e2.message || 'שגיאה בשליחה');
    }
  };

  const submitUpload = async () => {
    if (!uploadFile) return setUploadError('נא לבחור קובץ PDF');
    if (!uploadName.trim()) return setUploadError('נא לתת שם לטופס');
    if (uploadHasSignature === null) return setUploadError('נא לבחור אם נדרשת חתימה');
    if (uploadHasSignature && !signaturePlacementSaved) return setUploadError('יש לשמור מיקום חתימה לפני שמירת התבנית');

    setUploading(true);
    setUploadError('');
    try {
      const fd = new FormData();
      fd.append('file', uploadFile);
      fd.append('name', uploadName.trim());
      fd.append('has_signature', uploadHasSignature ? '1' : '0');
      if (uploadHasSignature) {
        fd.append('signature_page', String(signaturePlacement.page));
        fd.append('signature_x', String(signaturePlacement.x));
        fd.append('signature_y', String(signaturePlacement.y));
        fd.append('signature_width', String(signaturePlacement.width));
        fd.append('signature_height', String(signaturePlacement.height));
      }
      fd.append('mode', 'pdf_template');
      const res = await fetch(`${API_URL}/forms/hq/custom-templates`, { method: 'POST', body: fd });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'שגיאה בהעלאה');
      setShowUploadModal(false);
      setUploadFile(null); setUploadName(''); setUploadHasSignature(null);
      setSignaturePlacement({ page: 1, x: '', y: '', width: '', height: '' });
      setSignaturePlacementSaved(false);
      await load();
    } catch (e) {
      setUploadError(e.message || 'שגיאה בהעלאה');
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (!uploadFile) {
      setPdfUrl('');
      setPdfDoc(null);
      setPdfPageCount(0);
      setPdfCurrentPage(1);
      setPdfPageSize({ width: 0, height: 0 });
      setPdfRenderSize({ width: 0, height: 0 });
      setSignatureBox(null);
      return;
    }

    const objectUrl = URL.createObjectURL(uploadFile);
    setPdfUrl(objectUrl);
    setSignaturePlacementSaved(false);
    return () => URL.revokeObjectURL(objectUrl);
  }, [uploadFile]);

  useEffect(() => {
    if (!pdfUrl || uploadHasSignature !== true) return;
    let cancelled = false;
    let loadingTask;

    const loadPdf = async () => {
      setLoadingPdf(true);
      try {
        loadingTask = getDocument(pdfUrl);
        const doc = await loadingTask.promise;
        if (cancelled) return;
        setPdfDoc(doc);
        setPdfPageCount(doc.numPages || 1);
        setPdfCurrentPage(1);
        setSignatureBox({ ...DEFAULT_SIGNATURE_BOX });
      } catch (e) {
        if (!cancelled) {
          setUploadError('לא ניתן לטעון את ה-PDF לתצוגה מקדימה');
          setPdfDoc(null);
        }
      } finally {
        if (!cancelled) setLoadingPdf(false);
      }
    };

    loadPdf();
    return () => {
      cancelled = true;
      if (loadingTask?.destroy) loadingTask.destroy();
    };
  }, [pdfUrl, uploadHasSignature]);

  useEffect(() => {
    if (!pdfDoc || uploadHasSignature !== true) return;
    let cancelled = false;

    const renderCurrentPage = async () => {
      try {
        const page = await pdfDoc.getPage(pdfCurrentPage);
        if (cancelled) return;

        const baseViewport = page.getViewport({ scale: 1 });
        const containerWidth = Math.max(320, Math.min(760, (pdfWrapperRef.current?.clientWidth || 520) - 2));
        const scale = containerWidth / baseViewport.width;
        const viewport = page.getViewport({ scale });

        const canvas = pdfCanvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        await page.render({ canvasContext: context, viewport }).promise;
        if (cancelled) return;

        setPdfPageSize({ width: baseViewport.width, height: baseViewport.height });
        setPdfRenderSize({ width: viewport.width, height: viewport.height });
      } catch {
        if (!cancelled) setUploadError('שגיאה בהצגת עמוד ה-PDF');
      }
    };

    renderCurrentPage();
    return () => { cancelled = true; };
  }, [pdfDoc, pdfCurrentPage, uploadHasSignature]);

  const computeSignaturePlacementFromBox = (box = signatureBox) => {
    if (!box || !pdfPageSize.width || !pdfPageSize.height) return null;
    return {
      page: pdfCurrentPage,
      x: Number((box.x * pdfPageSize.width).toFixed(2)),
      y: Number((box.y * pdfPageSize.height).toFixed(2)),
      width: Number((box.width * pdfPageSize.width).toFixed(2)),
      height: Number((box.height * pdfPageSize.height).toFixed(2))
    };
  };

  const startDrag = (e, mode) => {
    if (!signatureBox || !pdfRenderSize.width || !pdfRenderSize.height) return;
    e.preventDefault();
    e.stopPropagation();
    dragStateRef.current = {
      mode,
      startX: e.clientX,
      startY: e.clientY,
      startBox: { ...signatureBox }
    };
    setDragMode(mode);
    setSignaturePlacementSaved(false);
  };

  useEffect(() => {
    if (!dragMode) return;

    const onMove = (e) => {
      const dragState = dragStateRef.current;
      if (!dragState || !pdfRenderSize.width || !pdfRenderSize.height) return;

      const deltaX = (e.clientX - dragState.startX) / pdfRenderSize.width;
      const deltaY = (e.clientY - dragState.startY) / pdfRenderSize.height;
      const minW = 60 / pdfRenderSize.width;
      const minH = 30 / pdfRenderSize.height;

      setSignatureBox((prev) => {
        if (!prev) return prev;
        let next = { ...dragState.startBox };

        if (dragState.mode === 'move') {
          next.x = clamp01(next.x + deltaX);
          next.y = clamp01(next.y + deltaY);
          next.x = clamp01(Math.min(next.x, 1 - next.width));
          next.y = clamp01(Math.min(next.y, 1 - next.height));
        } else if (dragState.mode === 'resize') {
          const width = Math.max(minW, Math.min(1 - next.x, next.width + deltaX));
          const height = Math.max(minH, Math.min(1 - next.y, next.height + deltaY));
          next.width = width;
          next.height = height;
        }

        return next;
      });
    };

    const onUp = () => {
      setDragMode(null);
      dragStateRef.current = null;
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragMode, pdfRenderSize.height, pdfRenderSize.width]);

  const placeSignatureBox = (e) => {
    if (!pdfRenderSize.width || !pdfRenderSize.height) return;
    const bounds = e.currentTarget.getBoundingClientRect();
    const clickX = clamp01((e.clientX - bounds.left) / bounds.width);
    const clickY = clamp01((e.clientY - bounds.top) / bounds.height);
    const width = signatureBox?.width || DEFAULT_SIGNATURE_BOX.width;
    const height = signatureBox?.height || DEFAULT_SIGNATURE_BOX.height;

    setSignatureBox({
      x: clamp01(Math.min(clickX - width / 2, 1 - width)),
      y: clamp01(Math.min(clickY - height / 2, 1 - height)),
      width,
      height
    });
    setSignaturePlacementSaved(false);
  };

  const confirmVisualPlacement = () => {
    const placement = computeSignaturePlacementFromBox();
    if (!placement) {
      setUploadError('לא ניתן לשמור מיקום חתימה. נסה לבחור עמוד/מיקום מחדש.');
      setSignaturePlacementSaved(false);
      return;
    }

    setSignaturePlacement(placement);
    setSignaturePlacementSaved(true);
    setUploadError('');
  };

  useEffect(() => {
    if (!signatureBox || uploadHasSignature !== true) return;
    const placement = computeSignaturePlacementFromBox(signatureBox);
    if (!placement) return;
    setSignaturePlacement(placement);
  }, [signatureBox, pdfCurrentPage, pdfPageSize.width, pdfPageSize.height, uploadHasSignature]);

  const tabData = activeTab === 'pending' ? pendingSignature : activeTab === 'today' ? sentToday : history;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="text-gray-600 mt-1">{subtitle}</p>
        </div>
        <button onClick={() => setShowUploadModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-medium">📄 טען טופס</button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3">{success}</div>}

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {templates.map((template) => (
          <div key={template.key} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <div className="font-semibold text-lg">{template.label}</div>
            <div className="text-xs text-gray-500">{template.is_custom_pdf ? 'תבנית PDF מותאמת' : 'תבנית מערכת'}</div>
            <label className="text-xs text-gray-600 block">
              תוכן תבנית
              <textarea readOnly rows={3} value={template.template_text || ''} className="mt-1 w-full border rounded-lg px-3 py-2 bg-gray-50 text-sm" />
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => openEditTemplate(template)} className="w-full border border-gray-300 hover:bg-gray-50 py-2 rounded-lg">עריכה</button>
              <button onClick={() => openSend(template)} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg">שלח תבנית</button>
              <button onClick={() => openDeleteTemplate(template)} className="w-full border border-red-300 text-red-700 hover:bg-red-50 py-2 rounded-lg">מחק</button>
            </div>
          </div>
        ))}
      </section>

      <section className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex gap-2 mb-4">
          <button onClick={() => setActiveTab('pending')} className={`px-3 py-2 rounded-lg text-sm ${activeTab === 'pending' ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`}>ממתין לחתימה</button>
          <button onClick={() => setActiveTab('today')} className={`px-3 py-2 rounded-lg text-sm ${activeTab === 'today' ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`}>נשלח היום</button>
          <button onClick={() => setActiveTab('history')} className={`px-3 py-2 rounded-lg text-sm ${activeTab === 'history' ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`}>היסטוריה</button>
        </div>

        {tabData.length === 0 ? <div className="text-gray-500">אין נתונים להצגה</div> : (
          <div className="space-y-2">
            {tabData.map((h) => (
              <div key={h.id} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">#{h.id} • {h.recipient_name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[h.status] || 'bg-gray-100 text-gray-600'}`}>{STATUS_LABELS[h.status] || h.status}</span>
                </div>
                <div className="text-sm text-gray-500">{h.template_key} | {h.building_name || '-'} | {h.recipient_contact || '-'}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      {sendOpen && selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={send} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 space-y-3" dir="rtl">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">שליחת תבנית: {selectedTemplate.label}</h3>
              <button type="button" onClick={() => setSendOpen(false)} className="text-2xl text-gray-500">×</button>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              <label className="text-sm">קהל יעד
                <select className="mt-1 w-full border rounded-lg px-3 py-2" value={form.recipientType} onChange={(e) => setForm((p) => ({ ...p, recipientType: e.target.value, recipientId: '', recipientName: '', recipientContact: '', buildingId: e.target.value === 'tenant' ? p.buildingId : '' }))}>
                  <option value="tenant">דייר</option>
                  <option value="supplier">ספק</option>
                </select>
              </label>

              {form.recipientType === 'tenant' ? (
                <label className="text-sm">מבנה
                  <select className="mt-1 w-full border rounded-lg px-3 py-2" value={form.buildingId} onChange={(e) => setForm((p) => ({ ...p, buildingId: e.target.value, recipientId: '', recipientName: '', recipientContact: '' }))}>
                    <option value="">בחר מבנה</option>
                    {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </label>
              ) : <div />}

              <label className="text-sm">{form.recipientType === 'tenant' ? 'בחירת דייר' : 'בחירת ספק'}
                <select
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                  value={form.recipientId}
                  disabled={form.recipientType === 'tenant' && !form.buildingId}
                  onChange={(e) => setForm((p) => ({ ...p, recipientId: e.target.value }))}
                >
                  <option value="">בחר</option>
                  {recipients.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </label>

              <label className="text-sm">שם נמען
                <input className="mt-1 w-full border rounded-lg px-3 py-2" value={form.recipientName} onChange={(e) => setForm((p) => ({ ...p, recipientName: e.target.value }))} />
              </label>

              <label className="text-sm">טלפון/אימייל
                <input className="mt-1 w-full border rounded-lg px-3 py-2" value={form.recipientContact} onChange={(e) => setForm((p) => ({ ...p, recipientContact: e.target.value }))} />
              </label>

              <label className="text-sm">כותרת
                <input className="mt-1 w-full border rounded-lg px-3 py-2" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
              </label>
            </div>

            <label className="text-sm block">תוכן הודעה לתבנית זו
              <textarea className="mt-1 w-full border rounded-lg px-3 py-2" rows={4} value={form.message} onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))} />
            </label>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setSendOpen(false)} className="px-4 py-2 border rounded-lg">ביטול</button>
              <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg">שלח</button>
            </div>
          </form>
        </div>
      )}

      {editOpen && editingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={saveTemplateEdit} className="bg-white rounded-2xl shadow-2xl w-full max-w-xl p-6 space-y-4" dir="rtl">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">עריכת תבנית</h3>
              <button type="button" onClick={() => setEditOpen(false)} className="text-2xl text-gray-500">×</button>
            </div>

            <label className="text-sm block">שם תצוגה
              <input className="mt-1 w-full border rounded-lg px-3 py-2" value={editForm.displayName} onChange={(e) => setEditForm((p) => ({ ...p, displayName: e.target.value }))} />
            </label>

            <label className="text-sm block">תוכן תבנית
              <textarea className="mt-1 w-full border rounded-lg px-3 py-2" rows={5} value={editForm.templateText} onChange={(e) => setEditForm((p) => ({ ...p, templateText: e.target.value }))} />
            </label>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditOpen(false)} className="px-4 py-2 border rounded-lg">ביטול</button>
              <button disabled={savingEdit} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">{savingEdit ? 'שומר...' : 'שמור'}</button>
            </div>
          </form>
        </div>
      )}

      {deleteOpen && templateToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4" dir="rtl">
            <h3 className="text-xl font-bold">מחיקת תבנית</h3>
            <p className="text-sm text-gray-700">
              האם למחוק את התבנית <span className="font-semibold">{templateToDelete.label}</span>?
            </p>
            <p className="text-xs text-gray-500">
              לתבניות שכבר נשלחו קיימת חסימה אוטומטית כדי לא לפגוע בהיסטוריה.
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => { setDeleteOpen(false); setTemplateToDelete(null); }} className="px-4 py-2 border rounded-lg">ביטול</button>
              <button type="button" disabled={deletingTemplate} onClick={confirmDeleteTemplate} className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-lg">
                {deletingTemplate ? 'מוחק...' : 'כן, מחק'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5" dir="rtl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">טען טופס PDF</h2>
              <button onClick={() => setShowUploadModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>
            <div onDragOver={(e) => { e.preventDefault(); setUploadDragOver(true); }} onDragLeave={() => setUploadDragOver(false)} onDrop={(e) => { e.preventDefault(); setUploadDragOver(false); const f = e.dataTransfer?.files?.[0]; if (f) { setUploadFile(f); setUploadError(''); setSignaturePlacementSaved(false); } }} onClick={() => fileInputRef.current?.click()} className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer ${uploadDragOver ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 bg-gray-50'}`}>
              <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={(e) => { setUploadFile(e.target.files?.[0] || null); setUploadError(''); setSignaturePlacementSaved(false); }} />
              {uploadFile ? <div className="font-semibold">{uploadFile.name}</div> : <div className="text-sm text-gray-500">גרור או לחץ לבחירת PDF</div>}
            </div>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2" value={uploadName} onChange={(e) => setUploadName(e.target.value)} placeholder="שם הטופס" />
            <div className="flex gap-2">
              <button onClick={() => { setUploadHasSignature(true); setSignaturePlacementSaved(false); setUploadError(''); if (!signatureBox) setSignatureBox({ ...DEFAULT_SIGNATURE_BOX }); }} className={`flex-1 py-2 rounded-lg border ${uploadHasSignature === true ? 'bg-indigo-600 text-white' : ''}`}>עם חתימה</button>
              <button onClick={() => { setUploadHasSignature(false); setSignaturePlacementSaved(false); setUploadError(''); setSignatureBox(null); }} className={`flex-1 py-2 rounded-lg border ${uploadHasSignature === false ? 'bg-gray-600 text-white' : ''}`}>ללא חתימה</button>
            </div>

            {uploadHasSignature === true && (
              <div className="space-y-3 border border-indigo-100 bg-indigo-50/40 rounded-lg p-3">
                <div className="text-sm font-semibold">שלב מיקום חתימה (חובה)</div>
                <div className="text-xs text-gray-700">לחץ על ה-PDF כדי למקם חתימה</div>

                {!uploadFile && <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1">יש לבחור קובץ PDF לפני מיקום חתימה.</div>}

                {uploadFile && (
                  <div className="space-y-2">
                    {pdfPageCount > 1 && (
                      <label className="text-xs text-gray-700 flex items-center gap-2">
                        עמוד למיקום
                        <select
                          className="border rounded-md px-2 py-1 bg-white"
                          value={pdfCurrentPage}
                          onChange={(e) => { setPdfCurrentPage(Number(e.target.value)); setSignaturePlacementSaved(false); }}
                        >
                          {Array.from({ length: pdfPageCount }, (_, i) => i + 1).map((pageNo) => (
                            <option key={pageNo} value={pageNo}>עמוד {pageNo}</option>
                          ))}
                        </select>
                      </label>
                    )}

                    <div
                      ref={pdfWrapperRef}
                      className="relative border border-gray-300 rounded-lg bg-white overflow-auto max-h-[55vh] mx-auto"
                      onClick={placeSignatureBox}
                    >
                      {loadingPdf && <div className="text-xs text-gray-500 p-3">טוען PDF...</div>}
                      <canvas ref={pdfCanvasRef} className="block mx-auto" />

                      {signatureBox && pdfRenderSize.width > 0 && pdfRenderSize.height > 0 && (
                        <div
                          className="absolute border-2 border-indigo-600 bg-indigo-500/15 rounded cursor-move select-none"
                          style={{
                            left: `${signatureBox.x * 100}%`,
                            top: `${signatureBox.y * 100}%`,
                            width: `${signatureBox.width * 100}%`,
                            height: `${signatureBox.height * 100}%`
                          }}
                          onMouseDown={(e) => startDrag(e, 'move')}
                          title="גרור להזזת החתימה"
                        >
                          <div className="text-[10px] text-indigo-700 bg-white/90 inline-block px-1 rounded m-1">חתימה</div>
                          <button
                            type="button"
                            className="absolute -bottom-2 -left-2 w-4 h-4 rounded-full bg-indigo-600 border-2 border-white cursor-nwse-resize"
                            onMouseDown={(e) => startDrag(e, 'resize')}
                            aria-label="שינוי גודל"
                            title="שינוי גודל"
                          />
                        </div>
                      )}
                    </div>

                    {signatureBox && (
                      <div className="text-[11px] text-gray-500">
                        קואורדינטות: עמוד {signaturePlacement.page} | X: {signaturePlacement.x} | Y: {signaturePlacement.y} | רוחב: {signaturePlacement.width} | גובה: {signaturePlacement.height}
                      </div>
                    )}

                    <button type="button" onClick={confirmVisualPlacement} className="w-full border border-indigo-300 text-indigo-700 py-2 rounded-lg">אישור מיקום חתימה</button>
                    {signaturePlacementSaved && <div className="text-xs text-green-700">✓ מיקום חתימה נשמר. אפשר לשמור את התבנית.</div>}
                  </div>
                )}
              </div>
            )}

            {uploadError && <div className="text-red-600 text-sm">{uploadError}</div>}
            <button onClick={submitUpload} disabled={uploading} className="w-full bg-indigo-600 text-white py-2.5 rounded-lg">{uploading ? 'מעלה...' : 'שמור טופס'}</button>
          </div>
        </div>
      )}
    </div>
  );
}
