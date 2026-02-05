import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { FaTimes } from 'react-icons/fa';
import DateChip from './DateChip';
import { toast } from 'react-toastify';

const frequencyOptions = [
  { value: 'one-time', label: 'חד-פעמי' },
  { value: 'daily', label: 'יומי' },
  { value: 'weekly', label: 'שבועי' },
  { value: 'biweekly', label: 'שבועיים' },
  { value: 'monthly', label: 'חודשי' },
  { value: 'semi-annual', label: 'חצי שנתי' },
  { value: 'annual', label: 'שנתי' }
];

const priorityOptions = [
  { value: 'urgent', label: 'דחוף' },
  { value: 'normal', label: 'רגיל' },
  { value: 'optional', label: 'עדיפות נמוכה' }
];

export default function QuickTaskModal({ isOpen, onClose }) {
  const { addTask, systems, employees } = useApp();
  const [taskMode, setTaskMode] = useState('one-time');
  const [title, setTitle] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isSaving, setIsSaving] = useState(false);
  const [titleError, setTitleError] = useState(false);

  const [formData, setFormData] = useState({
    frequency: 'daily',
    weekly_days: [],
    start_time: '',
    system_id: '',
    employee_id: '',
    priority: 'normal',
    estimated_duration_minutes: 30
  });

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

  const handleQuickSave = async () => {
    // Validate title
    if (!title.trim()) {
      setTitleError(true);
      setTimeout(() => setTitleError(false), 300);
      return;
    }

    if (isSaving) return;
    setIsSaving(true);

    try {
      // Format date as YYYY-MM-DD
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;

      const taskData = {
        title: title.trim(),
        start_date: formattedDate,
        start_time: '09:00',
        frequency: 'one-time',
        is_recurring: false,
        priority: 'normal',
        estimated_duration_minutes: 30,
        status: 'draft'
      };

      await addTask(taskData);
      toast.success('משימה נוצרה', {
        position: 'bottom-center',
        autoClose: 2000,
        hideProgressBar: true,
        rtl: true
      });
      onClose();
      // Reset form
      setTitle('');
      setSelectedDate(new Date());
      setTaskMode('one-time');
    } catch {
      toast.error('שגיאה ביצירת משימה', {
        position: 'bottom-center',
        autoClose: 2000,
        hideProgressBar: true,
        rtl: true
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRecurringSave = async () => {
    // Validate
    if (!title.trim() || !formData.start_time) {
      alert('נא למלא את כל השדות החובה');
      return;
    }

    // Validate time format
    const timePattern = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
    if (!timePattern.test(formData.start_time)) {
      alert('נא להזין שעה בפורמט HH:MM (לדוגמא: 14:30)');
      return;
    }

    if (isSaving) return;
    setIsSaving(true);

    try {
      // Format date as YYYY-MM-DD
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;

      const taskData = {
        title: title.trim(),
        start_date: formattedDate,
        start_time: formData.start_time,
        frequency: formData.frequency,
        is_recurring: formData.frequency !== 'one-time',
        weekly_days: formData.weekly_days,
        system_id: formData.system_id || null,
        employee_id: formData.employee_id || null,
        priority: formData.priority,
        estimated_duration_minutes: formData.estimated_duration_minutes,
        status: 'draft'
      };

      await addTask(taskData);
      toast.success('משימה נוצרה', {
        position: 'bottom-center',
        autoClose: 2000,
        hideProgressBar: true,
        rtl: true
      });
      onClose();
      // Reset form
      setTitle('');
      setSelectedDate(new Date());
      setTaskMode('one-time');
      setFormData({
        frequency: 'daily',
        weekly_days: [],
        start_time: '',
        system_id: '',
        employee_id: '',
        priority: 'normal',
        estimated_duration_minutes: 30
      });
    } catch {
      toast.error('שגיאה ביצירת משימה', {
        position: 'bottom-center',
        autoClose: 2000,
        hideProgressBar: true,
        rtl: true
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 font-alef">
            משימה חדשה
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

          {/* Radio toggle */}
          <div className="flex gap-2 bg-gray-100 p-1 rounded-full">
            <button
              type="button"
              onClick={() => setTaskMode('one-time')}
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
              onClick={() => setTaskMode('recurring')}
              className={`flex-1 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                taskMode === 'recurring'
                  ? 'bg-gray-900 text-white'
                  : 'bg-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              חוזרת
            </button>
          </div>

          {/* Expandable recurring section */}
          <div
            className="grid transition-[grid-template-rows] duration-300 ease-out overflow-hidden"
            style={{
              gridTemplateRows: taskMode === 'recurring' ? '1fr' : '0fr'
            }}
          >
            <div className="min-h-0">
              <div className="space-y-4 pt-2">
                {/* Frequency */}
                <div>
                  <label className="block text-sm font-medium mb-1">תדירות</label>
                  <select
                    name="frequency"
                    value={formData.frequency}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[44px]"
                  >
                    {frequencyOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Weekly Days Selection - Only for Daily frequency */}
                {formData.frequency === 'daily' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <label className="block text-sm font-medium mb-3">בחר ימים בשבוע:</label>
                    <div className="space-y-2">
                      {[
                        { value: 0, label: 'יום ראשון' },
                        { value: 1, label: 'יום שני' },
                        { value: 2, label: 'יום שלישי' },
                        { value: 3, label: 'יום רביעי' },
                        { value: 4, label: 'יום חמישי' },
                        { value: 5, label: 'יום שישי' },
                        { value: 6, label: 'יום שבת' }
                      ].map((day) => (
                        <label key={day.value} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.weekly_days.includes(day.value)}
                            onChange={() => handleDayToggle(day.value)}
                            className="w-4 h-4 cursor-pointer"
                          />
                          <span>{day.label}</span>
                        </label>
                      ))}
                    </div>
                    {formData.weekly_days.length === 0 && (
                      <p className="text-xs text-blue-600 mt-2">
                        * אם לא תבחר ימים, המשימה תופיע בכל יום
                      </p>
                    )}
                  </div>
                )}

                {/* Start time */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    שעת התחלה <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="start_time"
                    value={formData.start_time}
                    onChange={handleChange}
                    placeholder="HH:MM (לדוגמא: 14:30)"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[44px]"
                  />
                </div>

                {/* System and Employee */}
                <div className="grid grid-cols-2 gap-4">
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

                {/* Priority */}
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

                {/* Duration */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    משך המשימה (דקות) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="estimated_duration_minutes"
                    value={formData.estimated_duration_minutes}
                    onChange={handleChange}
                    min="5"
                    step="5"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[44px]"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    כמה זמן צפוי לקחת ביצוע המשימה? (ברירת מחדל: 30 דקות)
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Save button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={taskMode === 'one-time' ? handleQuickSave : handleRecurringSave}
              disabled={isSaving}
              className="w-full bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 min-h-[44px] transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'שומר...' : 'שמור'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
