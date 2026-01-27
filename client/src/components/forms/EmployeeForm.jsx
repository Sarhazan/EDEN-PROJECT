import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';

export default function EmployeeForm({ employee, onClose }) {
  const { addEmployee, updateEmployee } = useApp();
  const isEditing = !!employee;

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    position: '',
    language: 'he'
  });

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
        <select
          name="language"
          value={formData.language}
          onChange={handleChange}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="he">עברית (Hebrew)</option>
          <option value="en">English</option>
          <option value="ru">Русский (Russian)</option>
          <option value="ar">العربية (Arabic)</option>
          <option value="hi">हिन्दी (Hindi)</option>
        </select>
        <p className="mt-1 text-sm text-gray-500">
          השפה שבה העובד יקבל הודעות ודפים אינטראקטיביים
        </p>
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
