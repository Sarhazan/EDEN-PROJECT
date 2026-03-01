import { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import axios from 'axios';
import { API_URL } from '../../config';

// All world languages (Google Translate list)
const ALL_WORLD_LANGUAGES = [
  { code: 'af', name: 'Afrikaans' },
  { code: 'sq', name: 'Albanian' },
  { code: 'am', name: 'Amharic' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hy', name: 'Armenian' },
  { code: 'as', name: 'Assamese' },
  { code: 'ay', name: 'Aymara' },
  { code: 'az', name: 'Azerbaijani' },
  { code: 'bm', name: 'Bambara' },
  { code: 'eu', name: 'Basque' },
  { code: 'be', name: 'Belarusian' },
  { code: 'bn', name: 'Bengali' },
  { code: 'bho', name: 'Bhojpuri' },
  { code: 'bs', name: 'Bosnian' },
  { code: 'bg', name: 'Bulgarian' },
  { code: 'ca', name: 'Catalan' },
  { code: 'ceb', name: 'Cebuano' },
  { code: 'zh-cn', name: 'Chinese (Simplified)' },
  { code: 'zh-tw', name: 'Chinese (Traditional)' },
  { code: 'co', name: 'Corsican' },
  { code: 'hr', name: 'Croatian' },
  { code: 'cs', name: 'Czech' },
  { code: 'da', name: 'Danish' },
  { code: 'dv', name: 'Dhivehi' },
  { code: 'doi', name: 'Dogri' },
  { code: 'nl', name: 'Dutch' },
  { code: 'en', name: 'English' },
  { code: 'eo', name: 'Esperanto' },
  { code: 'et', name: 'Estonian' },
  { code: 'ee', name: 'Ewe' },
  { code: 'fil', name: 'Filipino (Tagalog)' },
  { code: 'fi', name: 'Finnish' },
  { code: 'fr', name: 'French' },
  { code: 'fy', name: 'Frisian' },
  { code: 'gl', name: 'Galician' },
  { code: 'ka', name: 'Georgian' },
  { code: 'de', name: 'German' },
  { code: 'el', name: 'Greek' },
  { code: 'gn', name: 'Guarani' },
  { code: 'gu', name: 'Gujarati' },
  { code: 'ht', name: 'Haitian Creole' },
  { code: 'ha', name: 'Hausa' },
  { code: 'haw', name: 'Hawaiian' },
  { code: 'he', name: 'Hebrew' },
  { code: 'hi', name: 'Hindi' },
  { code: 'hmn', name: 'Hmong' },
  { code: 'hu', name: 'Hungarian' },
  { code: 'is', name: 'Icelandic' },
  { code: 'ig', name: 'Igbo' },
  { code: 'ilo', name: 'Ilocano' },
  { code: 'id', name: 'Indonesian' },
  { code: 'ga', name: 'Irish' },
  { code: 'it', name: 'Italian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'jv', name: 'Javanese' },
  { code: 'kn', name: 'Kannada' },
  { code: 'kk', name: 'Kazakh' },
  { code: 'km', name: 'Khmer' },
  { code: 'rw', name: 'Kinyarwanda' },
  { code: 'gom', name: 'Konkani' },
  { code: 'ko', name: 'Korean' },
  { code: 'kri', name: 'Krio' },
  { code: 'ku', name: 'Kurdish (Kurmanji)' },
  { code: 'ckb', name: 'Kurdish (Sorani)' },
  { code: 'ky', name: 'Kyrgyz' },
  { code: 'lo', name: 'Lao' },
  { code: 'la', name: 'Latin' },
  { code: 'lv', name: 'Latvian' },
  { code: 'ln', name: 'Lingala' },
  { code: 'lt', name: 'Lithuanian' },
  { code: 'lg', name: 'Luganda' },
  { code: 'lb', name: 'Luxembourgish' },
  { code: 'mk', name: 'Macedonian' },
  { code: 'mai', name: 'Maithili' },
  { code: 'mg', name: 'Malagasy' },
  { code: 'ms', name: 'Malay' },
  { code: 'ml', name: 'Malayalam' },
  { code: 'mt', name: 'Maltese' },
  { code: 'mi', name: 'Maori' },
  { code: 'mr', name: 'Marathi' },
  { code: 'mni-mtei', name: 'Meitei (Manipuri)' },
  { code: 'lus', name: 'Mizo' },
  { code: 'mn', name: 'Mongolian' },
  { code: 'my', name: 'Myanmar (Burmese)' },
  { code: 'ne', name: 'Nepali' },
  { code: 'no', name: 'Norwegian' },
  { code: 'ny', name: 'Nyanja (Chichewa)' },
  { code: 'or', name: 'Odia (Oriya)' },
  { code: 'om', name: 'Oromo' },
  { code: 'ps', name: 'Pashto' },
  { code: 'fa', name: 'Persian' },
  { code: 'pl', name: 'Polish' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'pa', name: 'Punjabi' },
  { code: 'qu', name: 'Quechua' },
  { code: 'ro', name: 'Romanian' },
  { code: 'ru', name: 'Russian' },
  { code: 'sm', name: 'Samoan' },
  { code: 'sa', name: 'Sanskrit' },
  { code: 'gd', name: 'Scots Gaelic' },
  { code: 'nso', name: 'Sepedi' },
  { code: 'sr', name: 'Serbian' },
  { code: 'st', name: 'Sesotho' },
  { code: 'sn', name: 'Shona' },
  { code: 'sd', name: 'Sindhi' },
  { code: 'si', name: 'Sinhala' },
  { code: 'sk', name: 'Slovak' },
  { code: 'sl', name: 'Slovenian' },
  { code: 'so', name: 'Somali' },
  { code: 'es', name: 'Spanish' },
  { code: 'su', name: 'Sundanese' },
  { code: 'sw', name: 'Swahili' },
  { code: 'sv', name: 'Swedish' },
  { code: 'tg', name: 'Tajik' },
  { code: 'ta', name: 'Tamil' },
  { code: 'tt', name: 'Tatar' },
  { code: 'te', name: 'Telugu' },
  { code: 'th', name: 'Thai' },
  { code: 'ti', name: 'Tigrinya' },
  { code: 'ts', name: 'Tsonga' },
  { code: 'tr', name: 'Turkish' },
  { code: 'tk', name: 'Turkmen' },
  { code: 'ak', name: 'Twi' },
  { code: 'uk', name: 'Ukrainian' },
  { code: 'ur', name: 'Urdu' },
  { code: 'ug', name: 'Uyghur' },
  { code: 'uz', name: 'Uzbek' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'cy', name: 'Welsh' },
  { code: 'xh', name: 'Xhosa' },
  { code: 'yi', name: 'Yiddish' },
  { code: 'yo', name: 'Yoruba' },
  { code: 'zu', name: 'Zulu' },
];

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
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState('');
  const [addLangError, setAddLangError] = useState('');
  const [addLangLoading, setAddLangLoading] = useState(false);
  const searchRef = useRef(null);

  // Fetch available languages (already added to DB)
  const fetchLanguages = async () => {
    try {
      const res = await axios.get(`${API_URL}/languages`);
      setLanguages(res.data);
    } catch (e) {
      setLanguages([
        { code: 'he', name: 'Hebrew' },
        { code: 'en', name: 'English' },
        { code: 'ru', name: 'Russian' },
        { code: 'ar', name: 'Arabic' },
        { code: 'hi', name: 'Hindi' },
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

  // Auto-focus search when picker opens
  useEffect(() => {
    if (showPicker && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [showPicker]);

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

  // Languages already in DB (codes)
  const existingCodes = new Set(languages.map((l) => l.code));

  // Filter world languages by search, exclude already-added ones
  const filteredWorld = ALL_WORLD_LANGUAGES.filter((lang) => {
    if (existingCodes.has(lang.code)) return false;
    if (!search.trim()) return true;
    return lang.name.toLowerCase().includes(search.toLowerCase());
  });

  const handleSelectWorldLang = async (lang) => {
    setAddLangError('');
    setAddLangLoading(true);
    try {
      await axios.post(`${API_URL}/languages`, { code: lang.code, name: lang.name });
      await fetchLanguages();
      setFormData((prev) => ({ ...prev, language: lang.code }));
      setShowPicker(false);
      setSearch('');
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
            onClick={() => { setShowPicker((v) => !v); setAddLangError(''); setSearch(''); }}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 min-h-[44px] hover:bg-gray-50 whitespace-nowrap transition-all duration-150 active:scale-95"
            title="הוסף שפה חדשה לרשימה"
          >
            + הוסף שפה
          </button>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          השפה שבה העובד יקבל הודעות ודפים אינטראקטיביים
        </p>

        {/* Language Picker */}
        {showPicker && (
          <div className="mt-2 border border-blue-200 rounded-lg bg-white shadow-lg overflow-hidden">
            <div className="p-2 border-b border-gray-100 bg-blue-50">
              <input
                ref={searchRef}
                type="text"
                placeholder="חפש שפה... (Search language)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="max-h-52 overflow-y-auto">
              {filteredWorld.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  {search ? 'לא נמצאו שפות תואמות' : 'כל השפות כבר ברשימה ✓'}
                </p>
              ) : (
                filteredWorld.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    disabled={addLangLoading}
                    onClick={() => handleSelectWorldLang(lang)}
                    className="w-full text-right px-4 py-2.5 text-sm hover:bg-blue-50 flex justify-between items-center transition-colors duration-100 disabled:opacity-50"
                  >
                    <span className="text-gray-400 text-xs">{lang.code}</span>
                    <span>{lang.name}</span>
                  </button>
                ))
              )}
            </div>
            {addLangError && (
              <div className="px-4 py-2 bg-red-50 border-t border-red-200">
                <p className="text-xs text-red-600">{addLangError}</p>
              </div>
            )}
            <div className="p-2 border-t border-gray-100 bg-gray-50">
              <button
                type="button"
                onClick={() => { setShowPicker(false); setSearch(''); setAddLangError(''); }}
                className="w-full text-sm text-gray-500 hover:text-gray-700 py-1"
              >
                סגור
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
