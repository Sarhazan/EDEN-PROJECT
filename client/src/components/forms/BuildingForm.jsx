import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';

export default function BuildingForm({ building, onClose }) {
  const { addBuilding, updateBuilding } = useApp();
  const isEditing = !!building;

  const [name, setName] = useState('');

  useEffect(() => {
    if (building) {
      setName(building.name || '');
    }
  }, [building]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      alert('נא למלא את שם המבנה');
      return;
    }

    try {
      if (isEditing) {
        await updateBuilding(building.id, { name: name.trim() });
      } else {
        await addBuilding({ name: name.trim() });
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
          שם המבנה <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="לדוגמא: הפריגטה 27"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[44px]"
          autoFocus
          required
        />
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
          {isEditing ? 'עדכן מבנה' : 'צור מבנה'}
        </button>
      </div>
    </form>
  );
}
