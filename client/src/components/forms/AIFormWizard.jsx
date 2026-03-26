import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../../config';
import { toast } from 'react-toastify';
import { FaTimes, FaMagic, FaPaperPlane, FaCheck, FaEdit, FaTrash } from 'react-icons/fa';

const FIELD_TYPE_LABELS = {
  text: 'טקסט',
  number: 'מספר',
  phone: 'טלפון',
  id: 'תעודת זהות',
  email: 'אימייל',
  date: 'תאריך',
  photo: 'העלאת תמונה',
  signature: 'חתימה',
  checkbox: 'תיבת סימון',
  select: 'בחירה מרשימה'
};

const FIELD_TYPE_ICONS = {
  text: '✏️', number: '🔢', phone: '📞', id: '🪪', email: '📧',
  date: '📅', photo: '📷', signature: '✍️', checkbox: '☑️', select: '📋'
};

function FieldPreview({ field }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm">
      <div className="flex items-center gap-2">
        <span>{FIELD_TYPE_ICONS[field.type] || '📝'}</span>
        <span className="font-medium text-gray-800">{field.label}</span>
        {field.required && <span className="text-red-400 text-xs">*חובה</span>}
        <span className="mr-auto text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
          {FIELD_TYPE_LABELS[field.type] || field.type}
        </span>
      </div>
      {field.type === 'select' && field.options?.length > 0 && (
        <div className="mt-1 text-xs text-gray-500 mr-6">
          {field.options.join(' / ')}
        </div>
      )}
    </div>
  );
}

export default function AIFormWizard({ isOpen, onClose, onSaved }) {
  const [step, setStep] = useState('chat'); // chat | preview | done
  const [messages, setMessages] = useState([]); // {role, text}
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [formResult, setFormResult] = useState(null); // { name, description, fields }
  const [formName, setFormName] = useState('');
  const [saving, setSaving] = useState(false);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setStep('chat');
      setMessages([{
        role: 'assistant',
        text: '✨ ספר לי במשפט אחד-שניים מה הטופס צריך לכלול, ואני אבנה אותו בשבילך.'
      }]);
      setInput('');
      setFormResult(null);
      setFormName('');
    }
  }, [isOpen]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');

    const newMessages = [...messages, { role: 'user', text }];
    setMessages(newMessages);
    setLoading(true);

    try {
      // Build history for API (convert to Gemini format)
      const apiHistory = newMessages
        .filter(m => m.role !== 'assistant' || m !== newMessages[0]) // skip first greeting
        .map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.text }]
        }));

      const res = await axios.post(`${API_URL}/forms/ai-chat`, { messages: apiHistory });
      const { parsed, raw } = res.data;

      if (parsed?.ready && parsed?.fields?.length > 0) {
        // AI is ready — move to preview
        setFormResult({ name: parsed.name, description: parsed.description, fields: parsed.fields });
        setFormName(parsed.name || 'טופס חדש');
        setMessages(prev => [...prev, {
          role: 'assistant',
          text: `✅ הטופס מוכן! הנה תצוגה מקדימה. תוכל לערוך את השם לפני השמירה.`
        }]);
        setStep('preview');
      } else {
        const question = parsed?.question || raw || 'יכול לפרט יותר?';
        setMessages(prev => [...prev, { role: 'assistant', text: question }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: '❌ שגיאה בתקשורת עם ה-AI. נסה שוב.'
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleSave = async () => {
    if (!formResult || saving) return;
    setSaving(true);
    try {
      // Fetch company logo to embed in template
      let logoPath = '';
      try {
        const companyRes = await axios.get(`${API_URL}/accounts/company`);
        logoPath = companyRes.data.company_logo_path || '';
      } catch {}

      await axios.post(`${API_URL}/forms/interactive`, {
        name: formName || formResult.name,
        description: formResult.description || '',
        fields_schema: formResult.fields,
        logo_path: logoPath
      });
      toast.success('התבנית נשמרה בהצלחה!', { position: 'bottom-center', rtl: true });
      setStep('done');
      onSaved?.();
    } catch (err) {
      toast.error('שגיאה בשמירת התבנית', { position: 'bottom-center', rtl: true });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-t-2xl">
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <FaTimes />
          </button>
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            <FaMagic /> צור טופס עם AI
          </h2>
        </div>

        {/* Chat step */}
        {step === 'chat' && (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-bl-sm'
                      : 'bg-gray-100 text-gray-800 rounded-br-sm'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-end">
                  <div className="bg-gray-100 rounded-2xl rounded-br-sm px-4 py-3 flex gap-1.5">
                    {[0,1,2].map(i => (
                      <span key={i} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-100">
              <div className="flex gap-2">
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || loading}
                  className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-all active:scale-95"
                >
                  <FaPaperPlane />
                </button>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="תאר את הטופס שאתה צריך..."
                  rows={2}
                  className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  autoFocus
                />
              </div>
              <p className="text-xs text-gray-400 mt-2 text-center">לחץ Enter לשליחה • Shift+Enter לשורה חדשה</p>
            </div>
          </>
        )}

        {/* Preview step */}
        {step === 'preview' && formResult && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0">
            {/* Form name editable */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">שם הטופס</label>
              <input
                value={formName}
                onChange={e => setFormName(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            {/* Fields preview */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                שדות ({formResult.fields.length})
              </label>
              <div className="space-y-2">
                {formResult.fields.map((field, i) => (
                  <FieldPreview key={i} field={field} />
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setStep('chat'); setFormResult(null); }}
                className="flex-1 border border-gray-300 text-gray-700 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <FaEdit size={12} /> ערוך תיאור
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formName.trim()}
                className="flex-[2] bg-indigo-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {saving
                  ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>שומר...</span></>
                  : <><FaCheck /><span>שמור תבנית</span></>
                }
              </button>
            </div>
          </div>
        )}

        {/* Done step */}
        {step === 'done' && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-3xl">✅</div>
            <h3 className="text-lg font-bold text-gray-900">התבנית נשמרה!</h3>
            <p className="text-sm text-gray-500">תוכל למצוא אותה ברשימת הטפסים האינטראקטיביים ולשלוח אותה לדיירים.</p>
            <button
              onClick={onClose}
              className="bg-indigo-600 text-white rounded-xl px-6 py-2.5 text-sm font-semibold hover:bg-indigo-700 active:scale-95 transition-all"
            >
              סגור
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
