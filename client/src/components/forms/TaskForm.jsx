import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './datepicker-custom.css';

const frequencyOptions = [
  { value: 'one-time', label: 'חד-פעמי' },
  { value: 'weekly', label: 'שבועי' },
  { value: 'biweekly', label: 'שבועיים' },
  { value: 'monthly', label: 'חודשי' },
  { value: 'semi-annual', label: 'חצי שנתי' },
  { value: 'annual', label: 'שנתי' },
  { value: 'daily', label: 'מותאם אישית' }
];

const priorityOptions = [
  { value: 'urgent', label: 'דחוף' },
  { value: 'normal', label: 'רגיל' },
  { value: 'optional', label: 'עדיפות נמוכה' }
];

export default function TaskForm({ task, onClose }) {
  const { addTask, updateTask, systems, employees, locations, buildings } = useApp();
  const isEditing = !!task;

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    system_id: '',
    employee_id: '',
    location_id: '',
    building_id: '',
    frequency: 'one-time',
    start_date: '',
    start_time: '',
    priority: 'normal',
    status: 'draft',
    is_recurring: false,
    weekly_days: [],
    estimated_duration_minutes: 30,
    due_date: ''
  });

  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDueDate, setSelectedDueDate] = useState(null);

  const convertISOToDisplay = (isoDate) => {
    // Convert YYYY-MM-DD to DD/MM/YYYY
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
      setFormData({
        title: task.title || '',
        description: task.description || '',
        system_id: task.system_id || '',
        employee_id: task.employee_id || '',
        location_id: task.location_id || '',
        building_id: task.building_id || '',
        frequency: task.frequency || 'one-time',
        start_date: convertISOToDisplay(task.start_date) || '',
        start_time: task.start_time || '',
        priority: task.priority || 'normal',
        status: task.status || 'draft',
        is_recurring: task.is_recurring === 1,
        weekly_days: task.weekly_days ? JSON.parse(task.weekly_days) : [],
        estimated_duration_minutes: task.estimated_duration_minutes || 30,
        due_date: task.due_date ? convertISOToDisplay(task.due_date) : ''
      });

      // Set selectedDate from task.start_date (YYYY-MM-DD format)
      if (task.start_date) {
        const parts = task.start_date.split('-');
        if (parts.length === 3) {
          const [year, month, day] = parts;
          setSelectedDate(new Date(parseInt(year), parseInt(month) - 1, parseInt(day)));
        }
      }

      if (task.due_date) {
        const parts = task.due_date.split('-');
        if (parts.length === 3) {
          const [year, month, day] = parts;
          setSelectedDueDate(new Date(parseInt(year), parseInt(month) - 1, parseInt(day)));
        }
      } else {
        setSelectedDueDate(null);
      }
    }
  }, [task]);

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

  const handleDateChange = (date) => {
    setSelectedDate(date);

    // Update formData.start_date with DD/MM/YYYY format
    if (date) {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      setFormData((prev) => ({
        ...prev,
        start_date: `${day}/${month}/${year}`
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        start_date: ''
      }));
    }
  };

  const handleFrequencyChange = (e) => {
    const frequency = e.target.value;
    setFormData((prev) => ({
      ...prev,
      frequency,
      is_recurring: frequency !== 'one-time',
      weekly_days: frequency === 'daily' ? [] : prev.weekly_days,
      due_date: frequency === 'one-time' ? prev.due_date : ''
    }));

    if (frequency !== 'one-time') {
      setSelectedDueDate(null);
    }
  };

  const handleDueDateChange = (date) => {
    setSelectedDueDate(date);

    if (date) {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      setFormData((prev) => ({
        ...prev,
        due_date: `${day}/${month}/${year}`
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        due_date: ''
      }));
    }
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
    // Convert DD/MM/YYYY to YYYY-MM-DD
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return dateStr;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // For daily tasks, validate only title and time
    // For other tasks, validate title, date, and time
    if (!formData.title || !formData.start_time) {
      alert('נא למלא את כל השדות החובה');
      return;
    }

    if (formData.frequency !== 'daily' && !formData.start_date) {
      alert('נא למלא את כל השדות החובה');
      return;
    }

    // Validate time format HH:MM
    if (formData.start_time) {
      const timePattern = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
      if (!timePattern.test(formData.start_time)) {
        alert('נא להזין שעה בפורמט HH:MM (לדוגמא: 14:30)');
        return;
      }
    }

    // Validate that date and time are not in the past
    if (formData.frequency !== 'daily') {
      // For non-daily tasks, validate date and time
      const [day, month, year] = formData.start_date.split('/');
      const [hours, minutes] = formData.start_time.split(':');
      const selectedDateTime = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hours),
        parseInt(minutes)
      );
      const now = new Date();

      if (!isEditing && selectedDateTime < now) {
        alert('לא ניתן לבחור תאריך ושעה בעבר');
        return;
      }

      // One-time only: due date cannot be before start date
      if (formData.frequency === 'one-time' && formData.due_date) {
        const [dueDay, dueMonth, dueYear] = formData.due_date.split('/');
        const dueDateOnly = new Date(parseInt(dueYear), parseInt(dueMonth) - 1, parseInt(dueDay));
        const startDateOnly = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

        if (dueDateOnly < startDateOnly) {
          alert('תאריך "סיום עד" לא יכול להיות לפני תאריך ההתחלה');
          return;
        }
      }
    }
    // For daily tasks, don't validate time - the task will start from the next occurrence of the selected day(s)

    try {
      const dataToSubmit = { ...formData };

      // For daily tasks, automatically set start_date to today
      if (formData.frequency === 'daily') {
        const today = new Date();
        dataToSubmit.start_date = today.toISOString().split('T')[0];
        dataToSubmit.due_date = null;
      } else {
        // Convert DD/MM/YYYY to YYYY-MM-DD for database
        dataToSubmit.start_date = convertDateToISO(formData.start_date);
        dataToSubmit.due_date = formData.frequency === 'one-time' && formData.due_date
          ? convertDateToISO(formData.due_date)
          : null;
      }

      if (isEditing) {
        await updateTask(task.id, dataToSubmit);
      } else {
        await addTask(dataToSubmit);
      }
      onClose();
    } catch (error) {
      alert('שגיאה: ' + error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">
          כותרת המשימה <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[44px]"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">תיאור</label>
        <input
          type="text"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="תיאור המשימה (אופציונלי)"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[44px]"
        />
      </div>

      {/* Frequency + Time */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">תדירות</label>
          <select
            name="frequency"
            value={formData.frequency}
            onChange={handleFrequencyChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[44px]"
          >
            {frequencyOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
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
            required
          />
        </div>
      </div>

      {/* Weekly Days Selection - Only for Daily frequency */}
      {formData.frequency === 'daily' && (
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

      {/* Date (non-daily) + Duration */}
      {formData.frequency !== 'daily' ? (
        <div className={`grid gap-3 ${formData.frequency === 'one-time' ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <div>
            <label className="block text-sm font-medium mb-1">
              תאריך התחלה <span className="text-red-500">*</span>
            </label>
            <DatePicker
              selected={selectedDate}
              onChange={handleDateChange}
              dateFormat="dd/MM/yyyy"
              placeholderText="בחר תאריך"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[44px]"
              minDate={new Date()}
              required
            />
          </div>

          {formData.frequency === 'one-time' && (
            <div>
              <label className="block text-sm font-medium mb-1">סיום עד (אופציונלי)</label>
              <DatePicker
                selected={selectedDueDate}
                onChange={handleDueDateChange}
                dateFormat="dd/MM/yyyy"
                placeholderText="ברירת מחדל: תאריך המשימה"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[44px]"
                minDate={selectedDate || new Date()}
                isClearable
              />
              <p className="text-xs text-gray-500 mt-1">אם לא נבחר תאריך, האיחור יחושב לפי תאריך המשימה.</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">
              משך (דקות) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="estimated_duration_minutes"
              value={formData.estimated_duration_minutes}
              onChange={handleChange}
              min="5"
              step="5"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[44px]"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              כמה זמן צפוי לקחת ביצוע המשימה? (ברירת מחדל: 30 דקות)
            </p>
          </div>
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium mb-1">
            משך (דקות) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            name="estimated_duration_minutes"
            value={formData.estimated_duration_minutes}
            onChange={handleChange}
            min="5"
            step="5"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[44px]"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            כמה זמן צפוי לקחת ביצוע המשימה? (ברירת מחדל: 30 דקות)
          </p>
        </div>
      )}

      {/* System + Employee */}
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

      {/* Location + Building */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">מיקום</label>
          <select
            name="location_id"
            value={formData.location_id}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[44px]"
          >
            <option value="">ללא מיקום</option>
            {locations && locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
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
            {buildings && buildings.map((building) => (
              <option key={building.id} value={building.id}>
                {building.name}
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
    </form>
  );
}
