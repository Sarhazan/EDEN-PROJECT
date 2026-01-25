import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';

const frequencyOptions = [
  { value: 'one-time', label: 'חד-פעמי' },
  { value: 'monthly', label: 'חודשי' },
  { value: 'quarterly', label: 'רבעוני' },
  { value: 'semi-annual', label: 'חצי שנתי' },
  { value: 'annual', label: 'שנתי' }
];

export default function SupplierForm({ supplier, onClose }) {
  const { addSupplier, updateSupplier } = useApp();
  const isEditing = !!supplier;

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    payment_frequency: 'monthly',
    next_payment_date: '',
    payment_amount: ''
  });

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

  const convertDateToISO = (dateStr) => {
    // Convert DD/MM/YYYY to YYYY-MM-DD
    if (!dateStr) return '';
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return dateStr;
  };

  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name || '',
        phone: supplier.phone || '',
        email: supplier.email || '',
        payment_frequency: supplier.payment_frequency || 'monthly',
        next_payment_date: convertISOToDisplay(supplier.next_payment_date) || '',
        payment_amount: supplier.payment_amount || ''
      });
    }
  }, [supplier]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name) {
      alert('נא למלא את שם הספק');
      return;
    }

    // Validate date format if provided
    if (formData.next_payment_date) {
      const datePattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
      if (!datePattern.test(formData.next_payment_date)) {
        alert('נא להזין תאריך בפורמט DD/MM/YYYY');
        return;
      }
    }

    try {
      const dataToSubmit = {
        ...formData,
        next_payment_date: convertDateToISO(formData.next_payment_date)
      };

      if (isEditing) {
        await updateSupplier(supplier.id, dataToSubmit);
      } else {
        await addSupplier(dataToSubmit);
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
          שם הספק <span className="text-red-500">*</span>
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
        <label className="block text-sm font-medium mb-1">אימייל</label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[44px]"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">תדירות תשלום</label>
        <select
          name="payment_frequency"
          value={formData.payment_frequency}
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

      <div>
        <label className="block text-sm font-medium mb-1">תאריך תשלום הבא</label>
        <input
          type="text"
          name="next_payment_date"
          value={formData.next_payment_date}
          onChange={handleChange}
          placeholder="DD/MM/YYYY"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[44px]"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">סכום לתשלום (₪)</label>
        <input
          type="number"
          name="payment_amount"
          value={formData.payment_amount}
          onChange={handleChange}
          step="0.01"
          min="0"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[44px]"
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
          {isEditing ? 'עדכן ספק' : 'צור ספק'}
        </button>
      </div>
    </form>
  );
}
