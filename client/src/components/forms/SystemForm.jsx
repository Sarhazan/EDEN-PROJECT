import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';

export default function SystemForm({ system, onClose }) {
  const { addSystem, updateSystem } = useApp();
  const isEditing = !!system;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    contact_person: '',
    phone: '',
    email: ''
  });

  useEffect(() => {
    if (system) {
      setFormData({
        name: system.name || '',
        description: system.description || '',
        contact_person: system.contact_person || '',
        phone: system.phone || '',
        email: system.email || ''
      });
    }
  }, [system]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name) {
      alert('נא למלא את שם המערכת');
      return;
    }

    try {
      if (isEditing) {
        await updateSystem(system.id, formData);
      } else {
        await addSystem(formData);
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
          שם המערכת <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">תיאור</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows="3"
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">איש קשר</label>
        <input
          type="text"
          name="contact_person"
          value={formData.contact_person}
          onChange={handleChange}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">טלפון</label>
        <input
          type="tel"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">אימייל</label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
        />
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
        >
          ביטול
        </button>
        <button
          type="submit"
          className="flex-1 bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800"
        >
          {isEditing ? 'עדכן מערכת' : 'צור מערכת'}
        </button>
      </div>
    </form>
  );
}
