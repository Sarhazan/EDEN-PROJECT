import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { format } from 'date-fns';
import { FaPlus, FaEdit, FaTrash, FaTruck, FaCheckCircle } from 'react-icons/fa';
import Modal from '../components/shared/Modal';
import SupplierForm from '../components/forms/SupplierForm';

export default function SuppliersPage() {
  const { suppliers, deleteSupplier, markSupplierAsPaid } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);

  const handleEdit = (supplier) => {
    setEditingSupplier(supplier);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSupplier(null);
  };

  const handleDelete = async (id, name) => {
    if (confirm(`האם אתה בטוח שברצונך למחוק את הספק "${name}"?`)) {
      try {
        await deleteSupplier(id);
      } catch (error) {
        alert('שגיאה: ' + error.message);
      }
    }
  };

  const handleMarkAsPaid = async (id, name) => {
    if (confirm(`סמן את התשלום לספק "${name}" כשולם?`)) {
      try {
        await markSupplierAsPaid(id);
      } catch (error) {
        alert('שגיאה: ' + error.message);
      }
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">ספקים ותוכחי שירות</h1>
          <p className="text-gray-600 mt-1">ניהול אנשי קשר ומעקב תשלומים</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-orange-600 flex items-center gap-2"
        >
          <FaPlus />
          הוסף ספק
        </button>
      </div>

      {/* Suppliers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {suppliers.length === 0 ? (
          <div className="col-span-full bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
            אין ספקים. לחץ על "הוסף ספק" כדי להתחיל
          </div>
        ) : (
          suppliers.map((supplier) => (
            <div
              key={supplier.id}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-primary bg-opacity-10 p-3 rounded-lg">
                    <FaTruck className="text-2xl text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{supplier.name}</h3>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(supplier)}
                    className="text-blue-500 hover:text-blue-600 p-1"
                    title="ערוך"
                  >
                    <FaEdit />
                  </button>
                  <button
                    onClick={() => handleDelete(supplier.id, supplier.name)}
                    className="text-red-500 hover:text-red-600 p-1"
                    title="מחק"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>

              <div className="text-sm text-gray-600 space-y-2 mb-4">
                {supplier.phone && <p>📞 {supplier.phone}</p>}
                {supplier.email && <p>📧 {supplier.email}</p>}
              </div>

              {supplier.next_payment_date && (
                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">תאריך תשלום הבא:</span>
                    <span className="font-semibold">
                      {format(new Date(supplier.next_payment_date), 'dd/MM/yyyy')}
                    </span>
                  </div>

                  {supplier.payment_amount > 0 && (
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-gray-600">סכום לתשלום:</span>
                      <span className="font-semibold text-lg text-green-600">
                        ₪{supplier.payment_amount.toFixed(2)}
                      </span>
                    </div>
                  )}

                  {supplier.payment_frequency !== 'one-time' && (
                    <button
                      onClick={() => handleMarkAsPaid(supplier.id, supplier.name)}
                      className="w-full bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 flex items-center justify-center gap-2"
                    >
                      <FaCheckCircle />
                      סמן כשולם
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Supplier Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingSupplier ? 'ערוך ספק' : 'ספק חדש'}
      >
        <SupplierForm supplier={editingSupplier} onClose={handleCloseModal} />
      </Modal>
    </div>
  );
}
