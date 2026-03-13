import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { toastApiError, TOAST_DEFAULTS } from '../../utils/apiError';
import { useApp } from '../../context/AppContext';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './datepicker-custom.css';

const TIME_OPTIONS = Array.from({ length: 24 * 4 }).map((_, i) => {
  const h = Math.floor(i / 4);
  const m = (i % 4) * 15;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
});

const calculateEndTime = (startStr, durationMinutes = 30) => {
  if (!startStr) return '';
  const [h, m] = startStr.split(':').map(Number);
  const totalMin = h * 60 + m + durationMinutes;
  const eH = Math.floor(totalMin / 60) % 24;
  const eM = Math.round((totalMin % 60) / 15) * 15;
  const finalM = eM === 60 ? 0 : eM;
  const finalH = eM === 60 ? (eH + 1) % 24 : eH;
  return `${String(finalH).padStart(2, '0')}:${String(finalM).padStart(2, '0')}`;
};

const getDuration = (startStr, endStr) => {
  if (!startStr || !endStr) return 30;
  const [sh, sm] = startStr.split(':').map(Number);
  const [eh, em] = endStr.split(':').map(Number);
  let dur = (eh * 60 + em) - (sh * 60 + sm);
  if (dur <= 0) dur += 24 * 60;
  return dur;
};

const getTodayIsraelStart = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());

  const year = Number(parts.find((p) => p.type === 'year')?.value);
  const month = Number(parts.find((p) => p.type === 'month')?.value);
  const day = Number(parts.find((p) => p.type === 'day')?.value);

  return new Date(year, month - 1, day);
};

export default function TaskForm({ task, initialValues = null, onClose }) {
  const { addTask, updateTask, deleteTask, deleteTaskSeries, systems, employees, buildings } = useApp();
  const isEditing = !!task;
  const [showRecurringUpdateDialog, setShowRecurringUpdateDialog] = useState(false);
  const [pendingSubmitData, setPendingSubmitData] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    system_id: '',
    employee_id: '',
    building_id: '',
    priority: 'normal',
    frequency: 'one-time',
    base_frequency: 'one-time',
    interval: 1,
    start_date: '',
    start_time: '',
    end_time: '',
    status: 'draft',
    is_recurring: false,
    weekly_days: [],
    estimated_duration_minutes: 30
  });

  const [selectedDate, setSelectedDate] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const todayIsraelStart = getTodayIsraelStart();

  const parseFrequency = (freq) => {
    if (freq === 'biweekly') return { base: 'weekly', interval: 2 };
    if (freq === 'semi-annual') return { base: 'monthly', interval: 6 };
    if (freq === 'weekly') return { base: 'weekly', interval: 1 };
    if (freq === 'monthly') return { base: 'monthly', interval: 1 };
    if (freq === 'annual') return { base: 'annual', interval: 1 };
    if (freq === 'daily') return { base: 'custom', interval: 1 };
    return { base: 'one-time', interval: 1 };
  };

  const getDbFrequency = (base, interval) => {
    if (base === 'weekly' && interval === 2) return 'biweekly';
    if (base === 'weekly') return 'weekly';
    if (base === 'monthly' && interval === 6) return 'semi-annual';
    if (base === 'monthly') return 'monthly';
    if (base === 'annual') return 'annual';
    if (base === 'custom') return 'daily';
    return 'one-time';
  };

  const convertISOToDisplay = (isoDate) => {
    if (!isoDate) return '';
    const parts = isoDate.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day}/${month}/${year}`;
    }
    return isoDate;
  };

  useEffect(() => {
    if (task) {
      const { base, interval } = parseFrequency(task.frequency || 'one-time');
      
      setFormData({
        title: task.title || '',
        description: task.description || '',
        system_id: task.system_id || '',
        employee_id: task.employee_id || '',
        building_id: task.building_id || '',
        priority: task.priority || 'normal',
        frequency: task.frequency || 'one-time',
        base_frequency: base,
        interval: interval,
        start_date: convertISOToDisplay(task.start_date) || '',
        start_time: task.start_time || '',
        end_time: calculateEndTime(task.start_time || '', task.estimated_duration_minutes || 30),
        status: task.status || 'draft',
        is_recurring: task.is_recurring === 1,
        weekly_days: task.weekly_days ? JSON.parse(task.weekly_days) : [],
        estimated_duration_minutes: task.estimated_duration_minutes || 30
      });

      if (task.start_date) {
        const parts = task.start_date.split('-');
        if (parts.length === 3) {
          const [year, month, day] = parts;
          setSelectedDate(new Date(parseInt(year), parseInt(month) - 1, parseInt(day)));
        }
      }
      return;
    }

    if (initialValues) {
      const initFreq = initialValues.frequency || 'one-time';
      const { base, interval } = parseFrequency(initFreq);

      setFormData((prev) => ({
        ...prev,
        ...initialValues,
        base_frequency: base,
        interval: interval,
        is_recurring: initFreq !== 'one-time',
        end_time: calculateEndTime(initialValues.start_time || '', initialValues.estimated_duration_minutes || 30)
      }));

      const dateStr = initialValues.start_date;
      if (dateStr) {
        const parts = dateStr.includes('/') ? dateStr.split('/') : dateStr.split('-').reverse();
        if (parts.length === 3) {
          const [day, month, year] = parts;
          setSelectedDate(new Date(parseInt(year), parseInt(month) - 1, parseInt(day)));
        }
      }
    }
  }, [task, initialValues]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let processedValue = value;
    if (type === 'checkbox') processedValue = checked;
    else if (type === 'number') processedValue = value === '' ? '' : parseInt(value, 10);

    setFormData((prev) => ({ ...prev, [name]: processedValue }));
  };

  const handleDateChange = (date) => {
    setSelectedDate(date);
    if (date) {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      setFormData((prev) => ({ ...prev, start_date: `${day}/${month}/${year}` }));
    } else {
      setFormData((prev) => ({ ...prev, start_date: '' }));
    }
  };

  const handleTimeChange = (field, value) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'start_time') {
        if (!value) {
          next.end_time = '';
          next.estimated_duration_minutes = 30;
          return next;
        }
        const currentDur = getDuration(prev.start_time, prev.end_time);
        const [sh, sm] = value.split(':').map(Number);
        const [eh, em] = (prev.end_time || '').split(':').map(Number);
        const sTotal = sh * 60 + sm;
        const eTotal = eh * 60 + em;
        if (!prev.end_time || eTotal <= sTotal) {
          next.end_time = calculateEndTime(value, 30);
          next.estimated_duration_minutes = 30;
        } else {
          next.end_time = calculateEndTime(value, currentDur);
          next.estimated_duration_minutes = currentDur;
        }
      } else if (field === 'end_time') {
        if (!value) {
           next.estimated_duration_minutes = 30;
           return next;
        }
        const dur = getDuration(prev.start_time, value);
        next.estimated_duration_minutes = dur;
      }
      return next;
    });
  };

  const handleBaseFreqChange = (e) => {
    const base = e.target.value;
    setFormData(prev => ({
      ...prev,
      base_frequency: base,
      interval: 1,
      is_recurring: base !== 'one-time',
      weekly_days: base === 'custom' ? prev.weekly_days : []
    }));
  };

  const handleIntervalChange = (e) => {
    const val = parseInt(e.target.value, 10) || 1;
    setFormData(prev => ({ ...prev, interval: val }));
  };

  const handleDayToggle = (day) => {
    setFormData((prev) => ({
      ...prev,
      weekly_days: prev.weekly_days.includes(day)
        ? prev.weekly_days.filter(d => d !== day)
        : [...prev.weekly_days, day]
    }));
  };

  const convertDateToISO = (dateStr) => {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return dateStr;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const dbFreq = getDbFrequency(formData.base_frequency, formData.interval);

    if (!formData.title) {
      toast.error('נא למלא כותרת', TOAST_DEFAULTS);
      return;
    }
    if (dbFreq !== 'daily' && !formData.start_date) {
      toast.error('נא לבחור תאריך', TOAST_DEFAULTS);
      return;
    }
    if (dbFreq !== 'daily' && dbFreq !== 'one-time' && formData.start_date) {
      const [d, m, y] = formData.start_date.split('/').map(Number);
      const selectedDate = new Date(y, m - 1, d);
      const today = new Date(); today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        toast.error('תאריך "החל מ" חייב להיות היום או בעתיד', TOAST_DEFAULTS);
        return;
      }
    }

    try {
      const dataToSubmit = { 
        ...formData, 
        frequency: dbFreq,
        is_recurring: dbFreq !== 'one-time'
      };

      if (dbFreq === 'daily') {
        const today = new Date();
        dataToSubmit.start_date = today.toISOString().split('T')[0];
      } else {
        dataToSubmit.start_date = convertDateToISO(formData.start_date);
      }

      if (isEditing) {
        // If recurring task in edit mode → show scope dialog
        if (task.is_recurring) {
          setPendingSubmitData(dataToSubmit);
          setShowRecurringUpdateDialog(true);
          return;
        }
        await updateTask(task.id, dataToSubmit);
      } else {
        await addTask(dataToSubmit);
      }
      onClose();
    } catch (error) {
      toastApiError(toast, error, 'שגיאה בשמירת המשימה');
    }
  };

  const executeUpdate = async (data, updateScope) => {
    try {
      await updateTask(task.id, { ...data, update_scope: updateScope });
      onClose();
    } catch (error) {
      toastApiError(toast, error, 'שגיאה בעדכון המשימה');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`למחוק מופע זה בלבד של "${formData.title}"? הפעולה לא ניתנת לביטול.`)) return;
    try {
      await deleteTask(task.id);
      onClose();
    } catch (error) {
      toastApiError(toast, error, 'שגיאה במחיקה');
    }
  };

  const handleDeleteSeries = async () => {
    if (!window.confirm(`למחוק את כל המופעים של "${formData.title}"?\n\nכל המשימות הקבועות בסדרה זו יימחקו לצמיתות.`)) return;
    try {
      await deleteTaskSeries(task.id);
      onClose();
    } catch (error) {
      toastApiError(toast, error, 'שגיאה במחיקת הסדרה');
    }
  };

  return (
    <>
    {/* Recurring update scope dialog */}
    {showRecurringUpdateDialog && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm space-y-4" dir="rtl">
          <h3 className="text-lg font-bold text-gray-900 font-alef">עדכון משימה חוזרת</h3>
          <p className="text-sm text-gray-600">איזו משימות ברצונך לעדכן?</p>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => { setShowRecurringUpdateDialog(false); executeUpdate(pendingSubmitData, 'single'); }}
              className="w-full bg-blue-600 text-white rounded-xl py-3 font-medium hover:bg-blue-700 active:scale-95 transition-all"
            >
              משימה זו בלבד
            </button>
            <button
              type="button"
              onClick={() => { setShowRecurringUpdateDialog(false); executeUpdate(pendingSubmitData, 'all'); }}
              className="w-full bg-indigo-600 text-white rounded-xl py-3 font-medium hover:bg-indigo-700 active:scale-95 transition-all"
            >
              כל המשימות החוזרות
            </button>
            <button
              type="button"
              onClick={() => { setShowRecurringUpdateDialog(false); setPendingSubmitData(null); }}
              className="w-full border border-gray-300 text-gray-700 rounded-xl py-3 font-medium hover:bg-gray-50 active:scale-95 transition-all"
            >
              ביטול
            </button>
          </div>
        </div>
      </div>
    )}
    <form onSubmit={handleSubmit} className="space-y-4 font-alef text-right" dir="rtl">
      {/* 1. Title */}
      <div>
        <label className="block text-sm font-medium mb-1">כותרת המשימה <span className="text-red-500">*</span></label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="כותרת המשימה"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[44px]"
          required
        />
      </div>

      {/* 2. Description */}
      <div>
        <label className="block text-sm font-medium mb-1">תיאור</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="תיאור המשימה (אופציונלי)"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
          rows="2"
        />
      </div>

      {/* Toggle One-Time / Recurring visually similar to QuickTaskModal */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-full">
        <button
          type="button"
          onClick={() => setFormData(prev => ({ ...prev, base_frequency: 'one-time', is_recurring: false }))}
          className={`flex-1 px-4 py-2 rounded-full text-sm font-medium transition-all ${
            formData.base_frequency === 'one-time'
              ? 'bg-gray-900 text-white'
              : 'bg-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          חד-פעמית
        </button>
        <button
          type="button"
          onClick={() => setFormData(prev => ({ ...prev, base_frequency: 'weekly', interval: 1, is_recurring: true }))}
          className={`flex-1 px-4 py-2 rounded-full text-sm font-medium transition-all ${
            formData.base_frequency !== 'one-time'
              ? 'bg-gray-900 text-white'
              : 'bg-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          חוזרת
        </button>
      </div>

      {/* 3. Frequency Options (only if recurring) */}
      {formData.base_frequency !== 'one-time' && (
        <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <div>
            <label className="block text-sm font-medium mb-1">סוג חזרה</label>
            <select
              value={formData.base_frequency}
              onChange={handleBaseFreqChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 h-[44px]"
            >
              <option value="weekly">שבועית</option>
              <option value="monthly">חודשית</option>
              <option value="annual">שנתית</option>
              <option value="custom">מותאם אישית (ימים)</option>
            </select>
          </div>
          
          {formData.base_frequency === 'weekly' && (
            <div>
              <label className="block text-sm font-medium mb-1">כל כמה שבועות</label>
              <input
                type="number"
                min="1"
                max="2"
                value={formData.interval}
                onChange={handleIntervalChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 h-[44px]"
              />
            </div>
          )}
          {formData.base_frequency === 'monthly' && (
            <div>
              <label className="block text-sm font-medium mb-1">כל כמה חודשים</label>
              <input
                type="number"
                min="1"
                max="6"
                value={formData.interval}
                onChange={handleIntervalChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 h-[44px]"
              />
            </div>
          )}
          {formData.base_frequency === 'annual' && (
            <div>
              <label className="block text-sm font-medium mb-1">כל כמה שנים</label>
              <input
                type="number"
                min="1"
                max="1"
                value={formData.interval}
                onChange={handleIntervalChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 h-[44px]"
                disabled
              />
            </div>
          )}
        </div>
      )}

      {/* Weekly Days Selection - Only for Custom/Daily frequency */}
      {formData.base_frequency === 'custom' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <label className="block text-xs font-medium mb-2">בחר ימים בשבוע:</label>
          <div className="flex gap-1.5 justify-center">
            {[
              { value: 0, label: 'א' },
              { value: 1, label: 'ב' },
              { value: 2, label: 'ג' },
              { value: 3, label: 'ד' },
              { value: 4, label: 'ה' },
              { value: 5, label: 'ו' },
              { value: 6, label: 'ש' }
            ].map((day) => (
              <button
                key={day.value}
                type="button"
                onClick={() => handleDayToggle(day.value)}
                className={`w-9 h-9 rounded-full text-sm font-medium transition-all ${
                  formData.weekly_days.includes(day.value)
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white text-gray-600 border border-gray-300 hover:border-blue-400'
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 4. Start Date */}
      {formData.base_frequency !== 'custom' && (
        <div>
          <label className="block text-sm font-medium mb-1">
            החל מתאריך <span className="text-red-500">*</span>
          </label>
          <DatePicker
            selected={selectedDate}
            onChange={handleDateChange}
            onKeyDown={(e) => e.preventDefault()}
            dateFormat="dd/MM/yyyy"
            placeholderText="בחר תאריך"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[44px]"
            required
          />
        </div>
      )}

      {/* 5. & 6. Start Time & End Time */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">שעת התחלה</label>
          <select
            value={formData.start_time}
            onChange={(e) => handleTimeChange('start_time', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 h-[44px]"
          >
            <option value="">ללא שעה</option>
            {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">שעת סיום</label>
          <select
            value={formData.end_time}
            onChange={(e) => handleTimeChange('end_time', e.target.value)}
            disabled={!formData.start_time}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 h-[44px] disabled:bg-gray-100 disabled:text-gray-400"
          >
            <option value="">ללא שעה</option>
            {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* 9. Settings (Expandable) */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => setShowSettings(!showSettings)}
          className="text-sm text-gray-600 hover:text-gray-900 underline"
        >
          {showSettings ? 'הסתר הגדרות נוספות' : 'עוד הגדרות'}
        </button>
      </div>

      {showSettings && (
        <div className="space-y-3 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">מערכת</label>
              <select
                name="system_id"
                value={formData.system_id}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[44px]"
              >
                <option value="">משימה כללית</option>
                {systems && systems.map((system) => (
                  <option key={system.id} value={system.id}>{system.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">עובד אחראי</label>
              <select
                name="employee_id"
                value={formData.employee_id}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[44px]"
              >
                <option value="">עובד כללי</option>
                {employees && employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>{employee.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">מבנה</label>
              <select
                name="building_id"
                value={formData.building_id}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[44px]"
              >
                <option value="">ללא מבנה</option>
                {buildings && buildings.map((building) => (
                  <option key={building.id} value={building.id}>{building.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">עדיפות</label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[44px]"
              >
                <option value="normal">רגיל</option>
                <option value="urgent">דחוף</option>
                <option value="optional">עדיפות נמוכה</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* 7. Actions (Cancel | Update) */}
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
          {isEditing ? 'עדכן משימה' : 'צור משימה'}
        </button>
      </div>

      {/* 8. Deletion */}
      {isEditing && (
        <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-gray-200">
          {task.is_recurring ? (
            <>
              <button
                type="button"
                onClick={handleDelete}
                className="w-full bg-orange-50 border border-orange-200 text-orange-700 px-4 py-2 rounded-lg hover:bg-orange-100 min-h-[44px] transition-all duration-150 active:scale-95 text-sm font-medium"
              >
                🗑️ מחק מופע זה בלבד
              </button>
              <button
                type="button"
                onClick={handleDeleteSeries}
                className="w-full bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 min-h-[44px] transition-all duration-150 active:scale-95 text-sm font-medium"
              >
                🗑️ מחק המשימה הקבועה כולה
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleDelete}
              className="w-full bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 min-h-[44px] transition-all duration-150 active:scale-95 text-sm font-medium"
            >
              🗑️ מחק משימה
            </button>
          )}
        </div>
      )}
    </form>
    </>
  );
}