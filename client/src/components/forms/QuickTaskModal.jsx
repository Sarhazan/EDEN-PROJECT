import { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './datepicker-custom.css';
import { useApp } from '../../context/AppContext';
import { FaTimes } from 'react-icons/fa';
import DateChip from './DateChip';
import { toast } from 'react-toastify';
import { toastApiError, TOAST_DEFAULTS } from '../../utils/apiError';
import axios from 'axios';
import { API_URL } from '../../config';

const getIsraelDateParts = (d = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(d);

  const year = Number(parts.find((p) => p.type === 'year')?.value);
  const month = Number(parts.find((p) => p.type === 'month')?.value);
  const day = Number(parts.find((p) => p.type === 'day')?.value);

  return { year, month, day };
};

// Returns today's date as YYYY-MM-DD in Israel timezone
const localDateStr = (d = new Date()) => {
  const { year, month, day } = getIsraelDateParts(d);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const getIsraelStartOfToday = () => {
  const { year, month, day } = getIsraelDateParts(new Date());
  return new Date(year, month - 1, day);
};

const priorityOptions = [
  { value: 'urgent', label: 'דחוף' },
  { value: 'normal', label: 'רגיל' },
  { value: 'optional', label: 'עדיפות נמוכה' }
];

const parseFrequency = (freq) => {
  if (freq === 'biweekly') return { base: 'weekly', interval: 2 };
  if (freq === 'semi-annual') return { base: 'monthly', interval: 6 };
  if (freq === 'weekly') return { base: 'weekly', interval: 1 };
  if (freq === 'monthly') return { base: 'monthly', interval: 1 };
  if (freq === 'annual') return { base: 'annual', interval: 1 };
  if (freq === 'daily') return { base: 'custom', interval: 1 };
  return { base: 'weekly', interval: 1 };
};

const getDbFrequency = (base, interval) => {
  if (base === 'weekly' && interval === 2) return 'biweekly';
  if (base === 'weekly') return 'weekly';
  if (base === 'monthly' && interval === 6) return 'semi-annual';
  if (base === 'monthly') return 'monthly';
  if (base === 'annual') return 'annual';
  if (base === 'custom') return 'daily';
  return 'weekly';
};

const parseISODate = (value) => {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const TIME_OPTIONS = Array.from({ length: 24 * 4 }).map((_, i) => {
  const h = Math.floor(i / 4);
  const m = (i % 4) * 15;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
});

/** Current time rounded UP to nearest 15-min slot, in HH:MM format */
function currentTimeRounded() {
  const now = new Date();
  const totalMin = now.getHours() * 60 + now.getMinutes();
  const rounded = Math.ceil(totalMin / 15) * 15;
  const h = Math.floor(rounded / 60) % 24;
  const m = rounded % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

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

const extractTimeFromTitle = (rawTitle) => {
  const text = (rawTitle || '').trim();
  const match = text.match(/^(\d{1,2}:\d{2})\s+(.+)$/);
  if (!match) {
    return { title: text, startTime: '' };
  }

  const [, time, cleanTitle] = match;
  const [h, m] = time.split(':').map(Number);
  const valid = Number.isInteger(h) && Number.isInteger(m) && h >= 0 && h <= 23 && m >= 0 && m <= 59;

  if (!valid) {
    return { title: text, startTime: '' };
  }

  return {
    title: cleanTitle.trim(),
    startTime: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  };
};

export default function QuickTaskModal({ isOpen, onClose, initialValues = null, forceOneTime = false }) {
  const { addTask, systems, employees, buildings, updateTask } = useApp();
  const isEditMode = !!(initialValues && initialValues.id);
  const [taskMode, setTaskMode] = useState('one-time');
  const [title, setTitle] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isSaving, setIsSaving] = useState(false);
  const [titleError, setTitleError] = useState(false);
  const [showRecurringAdvanced, setShowRecurringAdvanced] = useState(false);
  const [quickDueEnabled, setQuickDueEnabled] = useState(false);
  const [quickDueDate, setQuickDueDate] = useState(null);
  const [managerEmployeeId, setManagerEmployeeId] = useState('');
  const [showRecurringUpdateDialog, setShowRecurringUpdateDialog] = useState(false);
  const [pendingUpdateData, setPendingUpdateData] = useState(null);

  const todayStr = localDateStr();
  const todayIsraelStart = getIsraelStartOfToday();

  const [formData, setFormData] = useState({
    description: '',
    frequency: 'weekly',
    base_frequency: 'weekly',
    interval: 1,
    weekly_days: [],
    start_date: todayStr,
    start_time: '',
    end_time: '',
    system_id: '',
    employee_id: '',
    building_id: '',
    priority: 'normal',
    estimated_duration_minutes: 30
  });

  // Load manager employee ID from settings
  useEffect(() => {
    axios.get(`${API_URL}/accounts/settings/manager_employee_id`)
      .then(res => {
        if (res.data.value) {
          setManagerEmployeeId(res.data.value);
        }
      })
      .catch(() => {});
  }, []);

  // Initialize defaults when modal opens (calendar prefill + manager fallback)
  useEffect(() => {
    if (!isOpen) return;

    const defaultDate = initialValues?.start_date ? parseISODate(initialValues.start_date) : new Date();
    const safeDate = defaultDate || new Date();

    const initialFreq = initialValues?.frequency || 'one-time';
    const { base, interval } = parseFrequency(initialFreq);

    // When creating from employee calendar (or other flows) and we explicitly want a
    // one-time task, force the UI into one-time mode for NEW tasks.
    if (forceOneTime && !isEditMode) {
      setTaskMode('one-time');
    } else {
      setTaskMode(initialFreq !== 'one-time' ? 'recurring' : 'one-time');
    }

    setTitle(initialValues?.title || '');
    setSelectedDate(safeDate);
    setQuickDueEnabled(false);
    setQuickDueDate(null);

    setFormData((prev) => ({
      ...prev,
      description: initialValues?.description || '',
      frequency: forceOneTime && !isEditMode ? 'one-time' : (initialValues?.frequency || 'weekly'),
      base_frequency: forceOneTime && !isEditMode ? 'weekly' : base,
      interval: forceOneTime && !isEditMode ? 1 : interval,
      weekly_days: initialValues?.weekly_days || [],
      start_date: initialValues?.start_date || localDateStr(safeDate),
      start_time: initialValues?.start_time || currentTimeRounded(),
      end_time: calculateEndTime(initialValues?.start_time || currentTimeRounded(), initialValues?.estimated_duration_minutes || 30),
      system_id: initialValues?.system_id || '',
      employee_id: initialValues?.employee_id || managerEmployeeId || prev.employee_id || '',
      building_id: initialValues?.building_id || '',
      priority: initialValues?.priority || 'normal',
      estimated_duration_minutes: initialValues?.estimated_duration_minutes || 30
    }));
  }, [isOpen, initialValues, managerEmployeeId]);

  // Scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

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

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let processedValue = value;

    if (type === 'checkbox') {
      processedValue = checked;
    } else if (type === 'number') {
      processedValue = value === '' ? '' : parseInt(value, 10);
    }

    setFormData((prev) => ({
      ...prev,
      [name]: processedValue
    }));
  };

  const handleBaseFreqChange = (e) => {
    const base = e.target.value;
    setFormData((prev) => ({
      ...prev,
      base_frequency: base,
      interval: 1,
      weekly_days: base === 'custom' ? prev.weekly_days : []
    }));
  };

  const handleIntervalChange = (e) => {
    const val = parseInt(e.target.value, 10) || 1;
    setFormData((prev) => ({ ...prev, interval: val }));
  };

  const handleDayToggle = (day) => {
    setFormData((prev) => ({
      ...prev,
      weekly_days: prev.weekly_days.includes(day)
        ? prev.weekly_days.filter(d => d !== day)
        : [...prev.weekly_days, day]
    }));
  };

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter' && taskMode === 'one-time') {
      e.preventDefault();
      handleQuickSave();
    }
  };

  const showTaskCreatedToast = (createdTask) => {
    const parseISODate = (value) => {
      if (!value) return null;
      const [year, month, day] = value.split('-').map(Number);
      if (!year || !month || !day) return null;
      return new Date(year, month - 1, day);
    };

    const createdDate = parseISODate(createdTask?.start_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const shouldShowNavigate = createdDate && createdDate > today;

    const navigateToTask = () => {
      if (!createdTask?.id || !createdTask?.start_date) return;
      window.dispatchEvent(new CustomEvent('myday:navigate-to-task', {
        detail: {
          taskId: createdTask.id,
          startDate: createdTask.start_date,
          source: 'toast-button'
        }
      }));
      toast.dismiss();
    };

    toast.success(
      <div className="flex flex-col gap-1">
        <span>המשימה נוצרה בהצלחה</span>
        {shouldShowNavigate && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigateToTask();
            }}
            className="text-sm underline text-blue-700 text-right"
          >
            למעבר למשימה לחץ כאן
          </button>
        )}
      </div>,
      {
        position: 'bottom-center',
        autoClose: 5000,
        hideProgressBar: true,
        closeOnClick: false,
        rtl: true
      }
    );
  };

  const handleQuickSave = async () => {
    // Validate title
    if (!title.trim()) {
      setTitleError(true);
      setTimeout(() => setTitleError(false), 300);
      return;
    }

    // Validate date is today or future (Israel timezone)
    const selectedDay = new Date(selectedDate);
    selectedDay.setHours(0, 0, 0, 0);
    if (selectedDay < todayIsraelStart) {
      toast.error('לא ניתן ליצור משימה בתאריך שעבר', TOAST_DEFAULTS);
      return;
    }

    // If today - validate time is not in the past
    const parsedForValidation = extractTimeFromTitle(title);
    const effectiveTime = parsedForValidation.startTime || formData.start_time || '';
    if (effectiveTime && selectedDay.getTime() === todayIsraelStart.getTime()) {
      const [h, m] = effectiveTime.split(':').map(Number);
      const nowInIsrael = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' }));
      if (h < nowInIsrael.getHours() || (h === nowInIsrael.getHours() && m < nowInIsrael.getMinutes())) {
        toast.error('לא ניתן ליצור משימה בשעה שכבר עברה', TOAST_DEFAULTS);
        return;
      }
    }

    if (isSaving) return;
    setIsSaving(true);

    try {
      // Format date as YYYY-MM-DD
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;

      const dueDateFormatted = quickDueEnabled && quickDueDate
        ? `${quickDueDate.getFullYear()}-${String(quickDueDate.getMonth() + 1).padStart(2, '0')}-${String(quickDueDate.getDate()).padStart(2, '0')}`
        : null;

      const parsed = extractTimeFromTitle(title);
      if (!parsed.title) {
        toast.error('נא להזין כותרת משימה תקינה', TOAST_DEFAULTS);
        return;
      }

      const taskData = {
        title: parsed.title,
        start_date: formattedDate,
        due_date: dueDateFormatted,
        start_time: parsed.startTime || formData.start_time || '',
        end_time: formData.end_time || '',
        frequency: 'one-time',
        is_recurring: false,
        priority: 'normal',
        estimated_duration_minutes: formData.estimated_duration_minutes || 30,
        description: formData.description,
        status: isEditMode && initialValues?.status ? initialValues.status : 'draft',
        employee_id: formData.employee_id || null
      };

      if (isEditMode) {
        await updateTask(initialValues.id, taskData);
        toast.success('המשימה עודכנה בהצלחה', TOAST_DEFAULTS);
      } else {
        const createdTask = await addTask(taskData);
        showTaskCreatedToast(createdTask);
      }
      onClose();
      // Reset form
      setTitle('');
      setSelectedDate(new Date());
      setQuickDueEnabled(false);
      setQuickDueDate(null);
      setTaskMode('one-time');
    } catch (err) {
      toastApiError(toast, err, 'שגיאה ביצירת משימה');
    } finally {
      setIsSaving(false);
    }
  };

  const executeRecurringSave = async (taskData, updateScope) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      if (isEditMode) {
        await updateTask(initialValues.id, { ...taskData, update_scope: updateScope });
        toast.success(
          updateScope === 'all' ? 'כל המשימות החוזרות עודכנו בהצלחה' : 'המשימה עודכנה בהצלחה',
          TOAST_DEFAULTS
        );
      } else {
        const createdTask = await addTask(taskData);
        showTaskCreatedToast(createdTask);
      }
      onClose();
      setTitle('');
      setSelectedDate(new Date());
      setQuickDueEnabled(false);
      setQuickDueDate(null);
      setTaskMode('one-time');
      setFormData({
        description: '',
        frequency: 'weekly',
        base_frequency: 'weekly',
        interval: 1,
        weekly_days: [],
        start_date: localDateStr(),
        start_time: '',
        system_id: '',
        employee_id: '',
        building_id: '',
        priority: 'normal',
        estimated_duration_minutes: 30
      });
    } catch (err) {
      toastApiError(toast, err, 'שגיאה בשמירת המשימה');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRecurringSave = async () => {
    const dbFreq = getDbFrequency(formData.base_frequency, formData.interval);

    // Validate
    if (!title.trim()) {
      toast.error('נא למלא את כל השדות החובה', TOAST_DEFAULTS);
      return;
    }

    // Validate recurring start date is today or future (Israel timezone) — only for new tasks
    if (!isEditMode) {
      const selectedStart = parseISODate(formData.start_date);
      if (!selectedStart) {
        toast.error('נא לבחור תאריך התחלה תקין', TOAST_DEFAULTS);
        return;
      }
      const selectedStartDay = new Date(selectedStart);
      selectedStartDay.setHours(0, 0, 0, 0);
      if (selectedStartDay < todayIsraelStart) {
        toast.error('במשימה חוזרת ניתן לבחור תאריך התחלה מהיום והלאה בלבד', TOAST_DEFAULTS);
        return;
      }
    }

    // Validate time format
    const timePattern = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
    if (!timePattern.test(formData.start_time)) {
      toast.error('נא להזין שעה בפורמט HH:MM (לדוגמא: 14:30)', TOAST_DEFAULTS);
      return;
    }

    const taskData = {
      title: title.trim(),
      description: formData.description.trim() || null,
      start_date: formData.start_date,
      start_time: formData.start_time,
      frequency: dbFreq,
      is_recurring: dbFreq !== 'one-time',
      weekly_days: formData.weekly_days,
      system_id: formData.system_id || null,
      employee_id: formData.employee_id || null,
      building_id: formData.building_id || null,
      priority: formData.priority,
      estimated_duration_minutes: formData.estimated_duration_minutes,
      status: isEditMode && initialValues?.status ? initialValues.status : 'draft'
    };

    // In edit mode for a recurring task → show scope dialog
    if (isEditMode && initialValues?.is_recurring) {
      setPendingUpdateData(taskData);
      setShowRecurringUpdateDialog(true);
      return;
    }

    // New recurring task (not edit mode)
    await executeRecurringSave(taskData, 'single');
  };

  if (!isOpen) return null;

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
              onClick={() => {
                setShowRecurringUpdateDialog(false);
                executeRecurringSave(pendingUpdateData, 'single');
              }}
              className="w-full bg-blue-600 text-white rounded-xl py-3 font-medium hover:bg-blue-700 active:scale-95 transition-all"
            >
              משימה זו בלבד
            </button>
            <button
              onClick={() => {
                setShowRecurringUpdateDialog(false);
                executeRecurringSave(pendingUpdateData, 'all');
              }}
              className="w-full bg-indigo-600 text-white rounded-xl py-3 font-medium hover:bg-indigo-700 active:scale-95 transition-all"
            >
              כל המשימות החוזרות
            </button>
            <button
              onClick={() => {
                setShowRecurringUpdateDialog(false);
                setPendingUpdateData(null);
              }}
              className="w-full border border-gray-300 text-gray-700 rounded-xl py-3 font-medium hover:bg-gray-50 active:scale-95 transition-all"
            >
              ביטול
            </button>
          </div>
        </div>
      </div>
    )}
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white w-full max-w-md max-h-[90vh] rounded-2xl shadow-2xl overflow-y-auto animate-scale-in">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 font-alef">
            {isEditMode ? 'עריכת משימה' : 'משימה חדשה'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-95 transition-all duration-200"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Title input with DateChip */}
          <div>
            <label className="block text-sm font-medium mb-1">
              כותרת המשימה <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={handleTitleKeyDown}
                placeholder="כותרת המשימה"
                className={`w-full border rounded-lg px-3 py-2 pe-20 min-h-[44px] ${
                  titleError ? 'border-red-500 animate-shake' : 'border-gray-300'
                }`}
                autoFocus
              />
              <div className="absolute left-2 top-1/2 -translate-y-1/2">
                <DateChip selectedDate={selectedDate} onChange={setSelectedDate} />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="תיאור המשימה (אופציונלי)"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
              rows="2"
            />
          </div>

          {/* Time Fields */}
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

          {/* Radio toggle */}
          <div className="flex gap-2 bg-gray-100 p-1 rounded-full">
            <button
              type="button"
              onClick={() => {
                setTaskMode('one-time');
                setShowRecurringAdvanced(false);
              }}
              className={`flex-1 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                taskMode === 'one-time'
                  ? 'bg-gray-900 text-white'
                  : 'bg-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              חד-פעמית
            </button>
            <button
              type="button"
              onClick={() => {
                setTaskMode('recurring');
                setQuickDueEnabled(false);
                setQuickDueDate(null);
              }}
              className={`flex-1 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                taskMode === 'recurring'
                  ? 'bg-gray-900 text-white'
                  : 'bg-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              חוזרת
            </button>
          </div>

          {taskMode === 'one-time' && (
            <div className="rounded-lg border border-gray-200 p-3 space-y-3">
              <div className="flex items-center gap-3">
                <input
                  id="quick-due-toggle"
                  type="checkbox"
                  checked={quickDueEnabled}
                  onChange={(e) => {
                    setQuickDueEnabled(e.target.checked);
                    if (!e.target.checked) setQuickDueDate(null);
                  }}
                  className="h-4 w-4"
                />
                <label htmlFor="quick-due-toggle" className="text-sm font-medium text-gray-700">
                  תאריך סיום
                </label>
              </div>

              {quickDueEnabled && (
                <div>
                  <DatePicker
                    selected={quickDueDate}
                    onChange={(date) => setQuickDueDate(date)}
                    dateFormat="dd/MM/yyyy"
                    placeholderText="בחר תאריך סיום"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[44px]"
                    minDate={selectedDate}
                  />
                </div>
              )}
            </div>
          )}

          {/* Expandable recurring section */}
          <div
            className="grid transition-[grid-template-rows] duration-300 ease-out overflow-hidden"
            style={{
              gridTemplateRows: taskMode === 'recurring' ? '1fr' : '0fr'
            }}
          >
            <div className="min-h-0">
              <div className="space-y-4 pt-2">
                {/* Advanced fields moved below */}

                {/* Frequency + Start Date */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">סוג חזרה</label>
                    <select
                      value={formData.base_frequency}
                      onChange={handleBaseFreqChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[44px]"
                    >
                      <option value="weekly">שבועית</option>
                      <option value="monthly">חודשית</option>
                      <option value="annual">שנתית</option>
                      <option value="custom">מותאם אישית (ימים)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      החל מתאריך <span className="text-red-500">*</span>
                    </label>
                    <DatePicker
                      selected={parseISODate(formData.start_date)}
                      onChange={(date) => {
                        if (!date) return;
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        setFormData((prev) => ({ ...prev, start_date: `${year}-${month}-${day}` }));
                      }}
                      onKeyDown={(e) => e.preventDefault()}
                      dateFormat="dd/MM/yyyy"
                      minDate={todayIsraelStart}
                      filterDate={(date) => {
                        const d = new Date(date);
                        d.setHours(0, 0, 0, 0);
                        return d >= todayIsraelStart;
                      }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[44px]"
                    />
                  </div>
                </div>

                {(formData.base_frequency === 'weekly' || formData.base_frequency === 'monthly' || formData.base_frequency === 'annual') && (
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {formData.base_frequency === 'weekly' ? 'כל כמה שבועות' : formData.base_frequency === 'monthly' ? 'כל כמה חודשים' : 'כל כמה שנים'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={formData.base_frequency === 'weekly' ? 2 : formData.base_frequency === 'monthly' ? 6 : 1}
                      value={formData.interval}
                      onChange={handleIntervalChange}
                      disabled={formData.base_frequency === 'annual'}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 h-[44px] disabled:bg-gray-100 disabled:text-gray-400"
                    />
                  </div>
                )}

                <div className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                  תיווצר משימה חוזרת ({formData.base_frequency === 'weekly' ? 'שבועית' : formData.base_frequency === 'monthly' ? 'חודשית' : formData.base_frequency === 'annual' ? 'שנתית' : 'מותאם אישית'}) החל מ־
                  {parseISODate(formData.start_date)
                    ? `${String(parseISODate(formData.start_date).getDate()).padStart(2, '0')}/${String(parseISODate(formData.start_date).getMonth() + 1).padStart(2, '0')}/${parseISODate(formData.start_date).getFullYear()}`
                    : '--/--/----'}
                  {formData.start_time ? ` בשעה ${formData.start_time}` : ''}
                </div>

                {/* Weekly Days Selection - Only for Custom frequency */}
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
                    {formData.weekly_days.length === 0 && (
                      <p className="text-xs text-blue-600 mt-2 text-center">
                        * אם לא תבחר ימים, המשימה תופיע בכל יום
                      </p>
                    )}
                  </div>
                )}

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowRecurringAdvanced((v) => !v)}
                    className="text-sm text-gray-600 hover:text-gray-900 underline"
                  >
                    {showRecurringAdvanced ? 'הסתר הגדרות נוספות' : 'עוד הגדרות'}
                  </button>
                </div>

                {showRecurringAdvanced && (
                  <div className="space-y-3 pt-1">
                    

                    {/* System and Employee */}
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
                          {systems.map((system) => (
                            <option key={system.id} value={system.id}>
                              {system.name}
                            </option>
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
                          {employees.map((employee) => (
                            <option key={employee.id} value={employee.id}>
                              {employee.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Building + Priority */}
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
                          {buildings.map((building) => (
                            <option key={building.id} value={building.id}>
                              {building.name}
                            </option>
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
                          {priorityOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Save button */}
          <div className="pt-2">
            {isEditMode ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 min-h-[44px] transition-all duration-150 active:scale-95"
                >
                  ביטול
                </button>
                <button
                  type="button"
                  onClick={taskMode === 'one-time' ? handleQuickSave : handleRecurringSave}
                  disabled={isSaving}
                  className="flex-[2] bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 min-h-[44px] transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSaving ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" /><span>שומר...</span></> : 'עדכן משימה'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={taskMode === 'one-time' ? handleQuickSave : handleRecurringSave}
                disabled={isSaving}
                className="w-full bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 min-h-[44px] transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSaving ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" /><span>שומר...</span></> : 'שמור'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}


