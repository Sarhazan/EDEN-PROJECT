import { useState, useEffect, useRef } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import '../forms/datepicker-custom.css';
import { toast } from 'react-toastify';
import { TOAST_DEFAULTS } from '../../utils/apiError';
import { useApp } from '../../context/AppContext';
import { FaUpload, FaFile, FaTimes, FaSync } from 'react-icons/fa';

const FREQUENCY_OPTIONS = [
  { value: 'daily',   label: 'יומי' },
  { value: 'weekly',  label: 'שבועי' },
  { value: 'monthly', label: 'חודשי' },
  { value: 'annual',  label: 'שנתי' },
];
import { BACKEND_URL } from '../../config';

const parseISODate = (value) => {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const toISODate = (date) => {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export default function UnitForm({ unit, systemId, onClose, onSaved }) {
  const { suppliers, buildings, addUnit, updateUnit, uploadUnitFile, deleteUnitFile } = useApp();
  const isEditing = !!unit;
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '',
    serial_number: '',
    inspection_date: '',
    alert_days: 3,
    supplier_id: '',
    building_id: '',
    notes: '',
    recurring_enabled: false,
    recurring_frequency: 'monthly',
    recurring_interval: 1,
  });

  const [files, setFiles] = useState([]);
  const [pendingFiles, setPendingFiles] = useState([]); // { file, filename }
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (unit) {
      setFormData({
        name: unit.name || '',
        serial_number: unit.serial_number || '',
        inspection_date: unit.inspection_date || '',
        alert_days: unit.alert_days || 3,
        supplier_id: unit.supplier_id || '',
        building_id: unit.building_id || '',
        notes: unit.notes || '',
        recurring_enabled: !!unit.recurring_enabled,
        recurring_frequency: unit.recurring_frequency || 'monthly',
        recurring_interval: unit.recurring_interval || 1,
      });
      setFiles(unit.files || []);
    }
  }, [unit]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleAddFile = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const newPending = selectedFiles.map(f => ({ file: f, filename: f.name }));
    setPendingFiles(prev => [...prev, ...newPending]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePendingFilenameChange = (index, newName) => {
    setPendingFiles(prev => prev.map((pf, i) => i === index ? { ...pf, filename: newName } : pf));
  };

  const handleRemovePendingFile = (index) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDeleteExistingFile = async (fileId) => {
    if (!confirm('האם למחוק קובץ זה?')) return;
    try {
      await deleteUnitFile(unit.id, fileId);
      setFiles(prev => prev.filter(f => f.id !== fileId));
    } catch (error) {
      toast.error('שגיאה: ' + error.message, TOAST_DEFAULTS);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error('נא למלא את שם היחידה', TOAST_DEFAULTS);
      return;
    }

    setSaving(true);
    try {
      let savedUnit;
      const payload = {
        ...formData,
        system_id: systemId,
        supplier_id: formData.supplier_id || null,
        building_id: formData.building_id || null,
        inspection_date: formData.inspection_date || null,
        recurring_enabled: formData.recurring_enabled ? 1 : 0,
        recurring_frequency: formData.recurring_enabled ? formData.recurring_frequency : null,
        recurring_interval: formData.recurring_enabled ? Number(formData.recurring_interval) || 1 : null,
      };

      if (isEditing) {
        savedUnit = await updateUnit(unit.id, payload);
      } else {
        savedUnit = await addUnit(payload);
      }

      // Upload pending files
      for (const pf of pendingFiles) {
        await uploadUnitFile(savedUnit.id, pf.file, pf.filename);
      }

      if (onSaved) onSaved();
      onClose();
    } catch (error) {
      toast.error('שגיאה: ' + error.message, TOAST_DEFAULTS);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">
            שם היחידה <span className="text-red-500">*</span>
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
          <label className="block text-sm font-medium mb-1">מספר סידורי</label>
          <input
            type="text"
            name="serial_number"
            value={formData.serial_number}
            onChange={handleChange}
            placeholder="לדוג׳ SN-12345"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[44px]"
          />
        </div>
      </div>

      {/* ── בדיקה תקופתית ─────────────────────────────────────────── */}
      <div className="border border-indigo-100 bg-indigo-50/40 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              name="recurring_enabled"
              checked={formData.recurring_enabled}
              onChange={handleChange}
              className="w-4 h-4 accent-indigo-600"
            />
            <FaSync className={`text-sm ${formData.recurring_enabled ? 'text-indigo-600' : 'text-gray-400'}`} />
            <span className="text-sm font-semibold text-gray-700">בדיקה תקופתית</span>
          </label>
        </div>

        {formData.recurring_enabled && (
          <div className="space-y-3">
            {/* תאריך בדיקה אחרונה */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">תאריך בדיקה קרובה</label>
              <DatePicker
                selected={parseISODate(formData.inspection_date)}
                onChange={(date) => setFormData((prev) => ({ ...prev, inspection_date: toISODate(date) }))}
                dateFormat="dd/MM/yyyy"
                placeholderText="DD/MM/YYYY"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[44px] bg-white"
                isClearable
              />
            </div>

            {/* תדירות + מספר */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">תדירות</label>
                <select
                  name="recurring_frequency"
                  value={formData.recurring_frequency}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[44px] bg-white"
                >
                  {FREQUENCY_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">כל כמה</label>
                <input
                  type="number"
                  name="recurring_interval"
                  value={formData.recurring_interval}
                  onChange={handleChange}
                  min="1"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[44px] bg-white"
                />
              </div>
            </div>

            {/* התראה */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">התראה (ימים לפני הבדיקה הבאה)</label>
              <input
                type="number"
                name="alert_days"
                value={formData.alert_days}
                onChange={handleChange}
                min="1"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[44px] bg-white"
              />
            </div>
          </div>
        )}

        {!formData.recurring_enabled && (
          <p className="text-xs text-gray-400">סמן כדי להגדיר בדיקה חוזרת עם התראה אוטומטית</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">ספק</label>
        <select
          name="supplier_id"
          value={formData.supplier_id}
          onChange={handleChange}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[44px]"
        >
          <option value="">ללא ספק</option>
          {suppliers.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">מבנה</label>
        <select
          name="building_id"
          value={formData.building_id}
          onChange={handleChange}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[44px]"
        >
          <option value="">ללא מבנה</option>
          {buildings.map(b => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">הערות</label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          rows="2"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[66px]"
        />
      </div>

      {/* Existing files (edit mode) */}
      {isEditing && files.length > 0 && (
        <div>
          <label className="block text-sm font-medium mb-1">קבצים קיימים</label>
          <div className="space-y-1">
            {files.map(file => (
              <div key={file.id} className="flex items-center gap-2 bg-gray-50 border rounded px-2 py-1 text-sm">
                <FaFile className="text-gray-400" size={12} />
                <a
                  href={`${BACKEND_URL}${file.file_path}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline flex-1 truncate"
                >
                  {file.filename}
                </a>
                <button
                  type="button"
                  onClick={() => handleDeleteExistingFile(file.id)}
                  className="text-red-400 hover:text-red-600 p-1"
                >
                  <FaTimes size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* File upload */}
      <div>
        <label className="block text-sm font-medium mb-1">העלאת קבצים</label>
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
        >
          <FaUpload className="mx-auto text-gray-400 mb-1" />
          <p className="text-sm text-gray-500">לחץ או גרור קבצים לכאן</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleAddFile}
          className="hidden"
        />
      </div>

      {/* Pending files list */}
      {pendingFiles.length > 0 && (
        <div className="space-y-2">
          {pendingFiles.map((pf, index) => (
            <div key={index} className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded px-2 py-1.5">
              <FaFile className="text-blue-400 flex-shrink-0" size={12} />
              <input
                type="text"
                value={pf.filename}
                onChange={(e) => handlePendingFilenameChange(index, e.target.value)}
                className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 min-w-0"
                placeholder="שם הקובץ"
              />
              <button
                type="button"
                onClick={() => handleRemovePendingFile(index)}
                className="text-red-400 hover:text-red-600 p-1 flex-shrink-0"
              >
                <FaTimes size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

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
          disabled={saving}
          className="flex-1 bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 min-h-[44px] transition-all duration-150 active:scale-95 disabled:opacity-50"
        >
          {saving ? 'שומר...' : isEditing ? 'עדכן יחידה' : 'צור יחידה'}
        </button>
      </div>
    </form>
  );
}
