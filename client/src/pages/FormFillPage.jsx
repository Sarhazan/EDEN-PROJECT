import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { API_URL, BACKEND_URL } from '../config';

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

// Simple canvas-based signature pad
function SignaturePad({ onSignature, disabled }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const startDraw = (e) => {
    if (disabled) return;
    e.preventDefault();
    drawing.current = true;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e) => {
    if (!drawing.current || disabled) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1e293b';
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const endDraw = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    drawing.current = false;
    if (hasDrawn || canvasRef.current) {
      onSignature(canvasRef.current.toDataURL('image/png'));
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    onSignature(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">חתימה <span className="text-red-500">*</span></span>
        {!disabled && <button type="button" onClick={clear} className="text-xs text-gray-400 hover:text-red-500">נקה</button>}
      </div>
      <div className="border-2 border-gray-300 rounded-xl overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          width={560}
          height={160}
          className="w-full touch-none cursor-crosshair"
          style={{ display: 'block' }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
      </div>
      {!hasDrawn && !disabled && (
        <p className="text-xs text-gray-400 text-center">חתום כאן באמצעות העכבר או מגע</p>
      )}
    </div>
  );
}

// Renders a specific PDF page with a signature-zone overlay
function PdfSignaturePage({ pdfUrl, signaturePlacement }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [pageSize, setPageSize] = useState(null); // { width, height } in PDF points
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const sigPage = signaturePlacement?.page || 1;

  useEffect(() => {
    if (!pdfUrl || !canvasRef.current) return;

    let cancelled = false;
    let loadingTask;
    let loadedDoc = null;

    const render = async () => {
      try {
        setLoading(true);
        setError(false);

        loadingTask = getDocument(pdfUrl);
        loadedDoc = await loadingTask.promise;
        if (cancelled) return;

        const totalPages = loadedDoc.numPages;
        const targetPage = Math.min(sigPage, totalPages);
        const page = await loadedDoc.getPage(targetPage);
        if (cancelled) return;

        const viewport = page.getViewport({ scale: 1 });
        setPageSize({ width: viewport.width, height: viewport.height });

        // Scale to fit container width
        const container = containerRef.current;
        const containerWidth = container ? container.clientWidth : 600;
        const scale = containerWidth / viewport.width;
        const scaledViewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;

        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
      } catch (err) {
        console.error('[PdfSignaturePage] render error:', err?.message || err);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    render();

    return () => {
      cancelled = true;
      if (loadingTask?.destroy) loadingTask.destroy();
      if (loadedDoc?.destroy) loadedDoc.destroy();
    };
  }, [pdfUrl, sigPage]);

  // Compute overlay position as percentages of the rendered page.
  // signature_placement coords are in PDF points, origin bottom-left.
  // We convert to top-left percentage for CSS positioning.
  const overlay = (() => {
    if (!pageSize || !signaturePlacement) return null;
    const { x = 0, y = 0, width = 150, height = 60 } = signaturePlacement;
    const pw = pageSize.width;
    const ph = pageSize.height;

    // Server stores y as top-down (see submit handler: pageHeight - sigY - sigH),
    // so signature_y is measured from the top of the page.
    return {
      left: `${(x / pw) * 100}%`,
      top: `${(y / ph) * 100}%`,
      width: `${(width / pw) * 100}%`,
      height: `${(height / ph) * 100}%`
    };
  })();

  if (error) return null; // fall back to regular viewer

  return (
    <div ref={containerRef} className="relative">
      {loading && (
        <div className="flex items-center justify-center py-12 text-gray-400 text-sm">טוען עמוד חתימה...</div>
      )}
      <canvas ref={canvasRef} className="w-full block rounded" style={{ display: loading ? 'none' : 'block' }} />
      {overlay && !loading && (
        <div
          style={{ position: 'absolute', ...overlay, pointerEvents: 'none' }}
          className="border-2 border-purple-500 bg-purple-100/30 rounded"
        >
          <span
            className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full shadow"
          >
            מיקום החתימה
          </span>
        </div>
      )}
    </div>
  );
}

export default function FormFillPage() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submittedByName, setSubmittedByName] = useState('');
  const [submittedByContact, setSubmittedByContact] = useState('');
  const [signatureDataUrl, setSignatureDataUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [readAcknowledged, setReadAcknowledged] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`${API_URL}/forms/site/dispatches/${id}`);
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'שגיאה בטעינת הטופס');
      setItem(payload.item);

      if (payload.item?.submission?.answers) {
        const { _signature, ...rest } = payload.item.submission.answers;
        setAnswers(rest);
        if (_signature) setSignatureDataUrl(_signature);
      }
    } catch (e) {
      setError(e.message || 'שגיאה בטעינה');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const setAnswer = (key, value) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!item) return;

    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const body = {
        answers,
        submittedByName,
        submittedByContact,
        readAcknowledged: true,
        ...(item.has_signature ? { signature_dataurl: signatureDataUrl } : {})
      };

      const res = await fetch(`${API_URL}/forms/site/dispatches/${id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'שגיאה בשליחת הטופס');

      const statusLabel = payload.status === 'signed' ? 'הטופס נחתם ונשלח בהצלחה. תודה!' : 'הטופס נשלח בהצלחה. תודה!';
      setSuccess(statusLabel);
      await load();
    } catch (e2) {
      setError(e2.message || 'שגיאה בשליחה');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center text-gray-500">טוען טופס...</div>;
  }

  if (error && !item) {
    return <div className="min-h-screen bg-gray-50 p-6 text-red-700">{error}</div>;
  }

  if (!item) {
    return <div className="min-h-screen bg-gray-50 p-6">טופס לא נמצא</div>;
  }

  const isCustomPdf = item.template?.is_custom_pdf;
  const hasSignature = item.has_signature;
  const isDone = item.status === 'submitted' || item.status === 'signed';

  const rawPdfPath = String(item.template?.pdf_url || '').trim();
  const pdfUrl = rawPdfPath ? `${BACKEND_URL}${rawPdfPath.startsWith('/') ? '' : '/'}${rawPdfPath}` : null;
  const signedCustomIntro = isCustomPdf && hasSignature ? [
    `שלום ${item.recipient_name}`,
    `טופס ${item.template?.label || 'טופס'} נשלח אלייך לחתימה`,
    'נא פתח את הקובץ, קרא, וחתום'
  ] : null;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8" dir="rtl">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header card */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-2">
          <h1 className="text-2xl font-bold">{item.template?.label || 'טופס'}</h1>
          {signedCustomIntro ? (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 space-y-1 text-indigo-900">
              {signedCustomIntro.map((line) => <p key={line} className="font-medium">{line}</p>)}
            </div>
          ) : (
            <p className="text-gray-600">נמען: {item.recipient_name}</p>
          )}
          {item.building_name && <p className="text-gray-600">מבנה: {item.building_name}</p>}
          {item.payload?.title && <p className="text-gray-800 font-medium">{item.payload.title}</p>}
          {item.payload?.message && !signedCustomIntro && <p className="text-gray-700 whitespace-pre-wrap">{item.payload.message}</p>}
          {item.payload?.amount && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-amber-800 mt-2">
              סכום לתשלום: {item.payload.amount}
            </div>
          )}
          {hasSignature && (
            <div className="flex items-center gap-2 text-purple-700 text-sm">
              <span>✍️</span> <span>טופס זה מצריך חתימה</span>
            </div>
          )}
        </div>

        {/* PDF Viewer */}
        {pdfUrl && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden my-4">
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">מסמך לעיון</span>
              <a href={pdfUrl} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline font-semibold">
                פתח בחלון חדש ↗
              </a>
            </div>

            {/* Custom PDF with signature: render the signature page with overlay */}
            {isCustomPdf && hasSignature && item.template?.signature_placement ? (
              <div className="p-3 space-y-2">
                <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 text-purple-800 text-sm text-center font-medium">
                  יש לחתום בעמוד {item.template.signature_placement.page || 1} — מיקום החתימה מסומן מטה
                </div>
                <PdfSignaturePage pdfUrl={pdfUrl} signaturePlacement={item.template.signature_placement} />
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block text-center text-xs text-indigo-600 hover:underline font-medium pt-1"
                >
                  לצפייה במסמך המלא — פתח בחלון חדש ↗
                </a>
              </div>
            ) : (
              <>
                {hasSignature && (
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block mx-4 mt-3 mb-2 text-center bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2 text-sm font-medium"
                  >
                    פתח את קובץ ה‑PDF לקריאה וחתימה
                  </a>
                )}
                {/* Desktop iframe */}
                <div className="hidden md:block">
                  <iframe
                    src={pdfUrl}
                    title="מסמך לצפייה"
                    className="w-full rounded border"
                    style={{ height: '500px' }}
                  />
                </div>

                {/* Mobile PDF card */}
                <div className="block md:hidden p-4">
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="text-red-500 text-3xl">📄</div>
                    <div className="flex-1 text-right">
                      <div className="font-medium text-gray-800">מסמך לצפייה</div>
                      <div className="text-sm text-blue-600">לחץ לפתיחה ←</div>
                    </div>
                  </a>
                </div>
              </>
            )}
          </div>
        )}

        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3">{error}</div>}
        {success && <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-center font-medium">{success}</div>}

        {/* Form / Signature */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <form onSubmit={submit} className="space-y-4">
            {/* Built-in template fields */}
            {!isCustomPdf && item.template?.fields?.map((field) => (
              <label key={field.key} className="block text-sm">
                <span className="font-medium">{field.label} {field.required ? <span className="text-red-500">*</span> : null}</span>

                {field.type === 'textarea' && (
                  <textarea
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
                    rows={4}
                    value={answers[field.key] || ''}
                    onChange={(e) => setAnswer(field.key, e.target.value)}
                    disabled={isDone}
                  />
                )}

                {field.type === 'checkbox' && (
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={field.key}
                      checked={!!answers[field.key]}
                      onChange={(e) => setAnswer(field.key, e.target.checked)}
                      disabled={isDone}
                      className="w-4 h-4"
                    />
                    <label htmlFor={field.key} className="text-sm text-gray-700 cursor-pointer">{field.label}</label>
                  </div>
                )}

                {field.type !== 'textarea' && field.type !== 'checkbox' && (
                  <input
                    type={field.type === 'number' ? 'number' : 'text'}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
                    value={answers[field.key] || ''}
                    onChange={(e) => setAnswer(field.key, e.target.value)}
                    disabled={isDone}
                  />
                )}
              </label>
            ))}

            {/* Submitter info + signature (with signature required) */}
            {hasSignature && (
              <>
                <div className="pt-2 border-t border-gray-100 space-y-3">
                  <label className="block text-sm">
                    <span className="font-medium">שם מלא <span className="text-red-500">*</span></span>
                    <input
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
                      value={submittedByName}
                      onChange={(e) => setSubmittedByName(e.target.value)}
                      disabled={isDone}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="font-medium">תעודת זהות <span className="text-red-500">*</span></span>
                    <input
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
                      value={submittedByContact}
                      onChange={(e) => setSubmittedByContact(e.target.value)}
                      disabled={isDone}
                    />
                  </label>

                  {/* "I confirm I read" checkbox */}
                  <div className="flex items-start gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="readAck"
                      checked={isDone || readAcknowledged}
                      onChange={(e) => setReadAcknowledged(e.target.checked)}
                      disabled={isDone}
                      className="w-4 h-4 mt-0.5 flex-shrink-0"
                    />
                    <label htmlFor="readAck" className="text-sm font-medium cursor-pointer">
                      אני מאשר שקראתי את <span className="text-red-500">*</span> <span className="text-gray-700">{item.template?.label || 'הטופס'}</span>
                    </label>
                  </div>
                </div>

                {/* Signature pad */}
                <div className="border-t border-gray-100 pt-4">
                  {isDone && signatureDataUrl ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">חתימה שהוגשה:</p>
                      <div className="border border-gray-200 rounded-xl overflow-hidden inline-block bg-white">
                        <img src={signatureDataUrl} alt="חתימה" className="max-h-32" />
                      </div>
                    </div>
                  ) : (
                    <SignaturePad onSignature={setSignatureDataUrl} disabled={isDone} />
                  )}
                </div>
              </>
            )}

            {/* No-signature: "I read it" button only */}
            {!hasSignature && !isDone && (
              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="readAckNoSig"
                    checked={readAcknowledged}
                    onChange={(e) => setReadAcknowledged(e.target.checked)}
                    className="w-4 h-4 mt-0.5 flex-shrink-0"
                  />
                  <label htmlFor="readAckNoSig" className="text-sm font-medium cursor-pointer">
                    קראתי את {item.template?.label || 'הטופס'}
                  </label>
                </div>
              </div>
            )}

            {!isDone ? (
              <button
                type="submit"
                disabled={
                  submitting ||
                  (hasSignature && (!signatureDataUrl || !submittedByName.trim() || !submittedByContact.trim() || !readAcknowledged)) ||
                  (!hasSignature && !readAcknowledged)
                }
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white px-4 py-2.5 rounded-lg font-medium transition-colors"
              >
                {submitting ? 'שולח...' : hasSignature ? '✍️ חתום ושלח' : 'קראתי ✓'}
              </button>
            ) : (
              <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-center">
                {item.status === 'signed' ? '✍️ הטופס נחתם בהצלחה' : '✅ הטופס הוגש בהצלחה'}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
