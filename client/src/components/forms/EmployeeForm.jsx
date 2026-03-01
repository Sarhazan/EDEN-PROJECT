import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import axios from 'axios';
import { API_URL } from '../../config';

export default function EmployeeForm({ employee, onClose }) {
  const { addEmployee, updateEmployee } = useApp();
  const isEditing = !!employee;

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    position: '',
    language: 'he'
  });

  const [languages, setLanguages] = useState([]);
  const [showAddLang, setShowAddLang] = useState(false);
  const [newLangCode, setNewLangCode] = useState('');
  const [newLangName, setNewLangName] = useState('');
  const [addLangError, setAddLangError] = useState('');
  const [addLangLoading, setAddLangLoading] = useState(false);

  // Fetch available languages
  const fetchLanguages = async () => {
    try {
      const res = await axios.get(`${API_URL}/languages`);
      setLanguages(res.data);
    } catch (e) {
      // fallback to defaults if API fails
      setLanguages([
        { code: 'he', name: 'עברית (Hebrew)' },
        { code: 'en', name: 'English' },
        { code: 'ru', name: 'Русский (Russian)' },
        { code: 'ar', name: 'العربية (Arabic)' },
        { code: 'hi', name: 'हिन्दी (Hindi)' },
      ]);
    }
  };

  useEffect(() => {
    fetchLanguages();
  }, []);

  useEffect(() => {
    if (employee) {
      setFormData({
        name: employee.name || '',
        phone: employee.phone || '',
        position: employee.position || '',
        language: employee.language || 'he'
      });
    }
  }, [employee]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name) {
      alert('נא למלא את שם העובד');
      return;
    }

    try {
      if (isEditing) {
        await updateEmployee(employee.id, formData);
      } else {
        await addEmployee(formData);
      }
      onClose();
    } catch (error) {
      alert('שגיאה: ' + error.message);
    }
  };

  const handleAddLanguage = async () => {
    setAddLangError('');
    if (!newLangCode.trim() || !newLangName.trim()) {
      setAddLangError('יש למלא קוד ושם שפה');
      return;
    }

    setAddLangLoading(true);
    try {
      const res = await axios.post(`${API_URL}/languages`, {
        code: newLangCode.trim(),
        name: newLangName.trim()
      });
      // Refresh list and select new language
      await fetchLanguages();
      setFormData((prev) => ({ ...prev, language: res.data.code }));
      setShowAddLang(false);
      setNewLangCode('');
      setNewLangName('');
    } catch (e) {
      setAddLangError(e.response?.data?.error || 'שגיאה בהוספת שפה');
    } finally {
      setAddLangLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">
          שם העובד <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[44px]"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">טלפון</label>
        <input
          type="tel"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[44px]"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">תפקיד</label>
        <input
          type="text"
          name="position"
          value={formData.position}
          onChange={handleChange}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[44px]"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">שפה</label>
        <div className="flex gap-2 items-center">
          <select
            name="language"
            value={formData.language}
            onChange={handleChange}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {languages.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => { setShowAddLang((v) => !v); setAddLangError(''); }}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 min-h-[44px] hover:bg-gray-50 whitespace-nowrap transition-all duration-150 active:scale-95"
            title="הוסף שפה חדשה לרשימה"
          >
            + הוסף שפה
          </button>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          השפה שבה העובד יקבל הודעות ודפים אינטראקטיביים
        </p>

        {/* Inline Add Language Form */}
        {showAddLang && (
          <div className="mt-3 p-3 border border-blue-200 rounded-lg bg-blue-50 space-y-2">
            <p className="text-sm font-medium text-blue-800">הוספת שפה חדשה לרשימה</p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="קוד (לדוגמה: hi, fil)"
                value={newLangCode}
                onChange={(e) => setNewLangCode(e.target.value.toLowerCase())}
                maxLength={10}
                className="w-28 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="שם שפה (לדוגמה: Hindi)"
                value={newLangName}
                onChange={(e) => setNewLangName(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {addLangError && (
              <p className="text-xs text-red-600">{addLangError}</p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAddLanguage}
                disabled={addLangLoading}
                className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all duration-150 active:scale-95"
              >
                {addLangLoading ? 'מוסיף...' : 'הוסף'}
              </button>
              <button
                type="button"
                onClick={() => { setShowAddLang(false); setAddLangError(''); setNewLangCode(''); setNewLangName(''); }}
                className="text-sm border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-all duration-150 active:scale-95"
              >
                ביטול
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 min-h-[44px] transition-all duration-150 active:scale-95"
        >
          ביטול
        </button>
        <button
          type="submit"
          className="flex-1 bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 min-h-[44px] transition-all duration-150 active:scale-95"
        >
          {isEditing ? 'עדכן עובד' : 'צור עובד'}
        </button>
      </div>
    </form>
  );
}
