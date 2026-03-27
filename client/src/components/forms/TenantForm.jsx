import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { toastApiError, TOAST_DEFAULTS } from '../../utils/apiError';
import { useApp } from '../../context/AppContext';

export default function TenantForm({ tenant, onClose }) {
  const { buildings, addTenant, updateTenant } = useApp();
  const isEditing = !!tenant;

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [apartmentNumber, setApartmentNumber] = useState('');
  const [floor, setFloor] = useState('');
  const [buildingId, setBuildingId] = useState('');
  const [notes, setNotes] = useState('');
  const [monthlyPayment, setMonthlyPayment] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');

  useEffect(() => {
    if (tenant) {
      setName(tenant.name || '');
      setPhone(tenant.phone || '');
      setEmail(tenant.email || '');
      setApartmentNumber(tenant.apartment_number || '');
      setFloor(tenant.floor || '');
      setBuildingId(tenant.building_id ? String(tenant.building_id) : '');
      setNotes(tenant.notes || '');
      setMonthlyPayment(tenant.monthly_payment ? String(tenant.monthly_payment) : '');
      setPaymentMethod(tenant.payment_method || 'cash');
    }
  }, [tenant]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim() || !buildingId || !apartmentNumber.trim() || !floor.trim()) {
      toast.error('נא למלא שם, מבנה, מספר דירה וקומה', TOAST_DEFAULTS);
      return;
    }

    const payload = {
      name: name.trim(),
      phone: phone.trim() || null,
      email: email.trim() || null,
      apartment_number: apartmentNumber.trim(),
      floor: floor.trim(),
      building_id: Number(buildingId),
      notes: notes.trim() || null,
      monthly_payment: monthlyPayment ? Number(monthlyPayment) : 0,
      payment_method: paymentMethod || 'cash'
    };

    try {
      if (isEditing) {
        await updateTenant(tenant.id, payload);
      } else {
        await addTenant(payload);
      }
      onClose();
    } catch (error) {
      toastApiError(toast, error, 'שגיאה בשמירת הדייר');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">שם דייר <span className="text-red-500">*</span></label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[44px]"
          placeholder="לדוגמה: ישראל ישראלי"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">מבנה <span className="text-red-500">*</span></label>
        <select
          value={buildingId}
          onChange={(e) => setBuildingId(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[44px]"
          required
        >
          <option value="">בחר מבנה</option>
          {buildings.map((building) => (
            <option key={building.id} value={building.id}>{building.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">מספר דירה <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={apartmentNumber}
            onChange={(e) => setApartmentNumber(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[44px]"
            placeholder="לדוגמה: 12"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">קומה <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={floor}
            onChange={(e) => setFloor(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[44px]"
            placeholder="לדוגמה: 3"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">טלפון</label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[44px]"
            placeholder="050-1234567"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">אימייל</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[44px]"
            placeholder="name@example.com"
          />
        </div>
      </div>

      {/* Billing */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
        <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">💳 פרטי תשלום</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">סכום חודשי (₪)</label>
            <input
              type="number"
              min="0"
              value={monthlyPayment}
              onChange={e => setMonthlyPayment(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[44px]"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">אופן תשלום</label>
            <select
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[44px]"
            >
              <option value="cash">מזומן</option>
              <option value="check">צ׳ק</option>
              <option value="standing_order">הוראת קבע</option>
              <option value="credit_card">כרטיס אשראי</option>
              <option value="bank_transfer">העברה בנקאית</option>
            </select>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">הערות</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
          placeholder="הערות נוספות..."
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
          {isEditing ? 'עדכן דייר' : 'צור דייר'}
        </button>
      </div>
    </form>
  );
}
