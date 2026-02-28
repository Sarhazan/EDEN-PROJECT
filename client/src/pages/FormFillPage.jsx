import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { API_URL } from '../config';

export default function FormFillPage() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submittedByName, setSubmittedByName] = useState('');
  const [submittedByContact, setSubmittedByContact] = useState('');
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
        setAnswers(payload.item.submission.answers);
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
    if (!item?.template) return;

    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const res = await fetch(`${API_URL}/forms/site/dispatches/${id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers,
          submittedByName,
          submittedByContact
        })
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'שגיאה בשליחת הטופס');

      setSuccess('הטופס נשלח בהצלחה. תודה!');
      await load();
    } catch (e2) {
      setError(e2.message || 'שגיאה בשליחה');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-50 p-6">טוען טופס...</div>;
  }

  if (error && !item) {
    return <div className="min-h-screen bg-gray-50 p-6 text-red-700">{error}</div>;
  }

  if (!item) {
    return <div className="min-h-screen bg-gray-50 p-6">טופס לא נמצא</div>;
  }

  const isSubmitted = item.status === 'submitted';

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-bold">{item.template.label}</h1>
          <p className="text-gray-600 mt-1">נמען: {item.recipient_name}</p>
          {item.building_name && <p className="text-gray-600">מבנה: {item.building_name}</p>}
          {item.payload?.title && <p className="text-gray-800 mt-2 font-medium">{item.payload.title}</p>}
          {item.payload?.message && <p className="text-gray-700 mt-1 whitespace-pre-wrap">{item.payload.message}</p>}
        </div>

        {item.payload?.amount && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-amber-800">
            סכום לתשלום: {item.payload.amount}
          </div>
        )}

        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3">{error}</div>}
        {success && <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3">{success}</div>}

        <form onSubmit={submit} className="space-y-4">
          {item.template.fields.map((field) => (
            <label key={field.key} className="block text-sm">
              <span className="font-medium">{field.label} {field.required ? <span className="text-red-500">*</span> : null}</span>

              {field.type === 'textarea' && (
                <textarea
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
                  rows={4}
                  value={answers[field.key] || ''}
                  onChange={(e) => setAnswer(field.key, e.target.value)}
                  disabled={isSubmitted}
                />
              )}

              {field.type === 'checkbox' && (
                <div className="mt-2">
                  <input
                    type="checkbox"
                    checked={!!answers[field.key]}
                    onChange={(e) => setAnswer(field.key, e.target.checked)}
                    disabled={isSubmitted}
                  />
                </div>
              )}

              {field.type !== 'textarea' && field.type !== 'checkbox' && (
                <input
                  type={field.type === 'number' ? 'number' : 'text'}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
                  value={answers[field.key] || ''}
                  onChange={(e) => setAnswer(field.key, e.target.value)}
                  disabled={isSubmitted}
                />
              )}
            </label>
          ))}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <label className="text-sm">
              שם ממלא הטופס
              <input
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
                value={submittedByName}
                onChange={(e) => setSubmittedByName(e.target.value)}
                disabled={isSubmitted}
              />
            </label>
            <label className="text-sm">
              טלפון/אימייל (אופציונלי)
              <input
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
                value={submittedByContact}
                onChange={(e) => setSubmittedByContact(e.target.value)}
                disabled={isSubmitted}
              />
            </label>
          </div>

          {!isSubmitted ? (
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg"
            >
              {submitting ? 'שולח...' : 'שלח טופס'}
            </button>
          ) : (
            <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3">
              הטופס כבר נשלח בהצלחה.
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
