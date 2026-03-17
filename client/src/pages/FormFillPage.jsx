import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { API_URL, BACKEND_URL } from '../config';

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
            <iframe
              src={pdfUrl}
              title="מסמך לצפייה"
              className="w-full rounded border"
              style={{ height: '500px' }}
            />
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

            {/* Submitter info */}
            {hasSignature && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                  <label className="text-sm">
                    שם מלא
                    <input
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
                      value={submittedByName}
                      onChange={(e) => setSubmittedByName(e.target.value)}
                      disabled={isDone}
                    />
                  </label>
                  <label className="text-sm">
                    תעודת זהות
                    <input
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
                      value={submittedByContact}
                      onChange={(e) => setSubmittedByContact(e.target.value)}
                      disabled={isDone}
                    />
                  </label>
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

            {!isDone ? (
              <button
                type="submit"
                disabled={submitting || (hasSignature && !signatureDataUrl)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white px-4 py-2.5 rounded-lg font-medium transition-colors"
              >
                {submitting ? 'שולח...' : hasSignature ? '✍️ חתום ושלח' : 'שלח טופס'}
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
