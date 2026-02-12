import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { FaPlus, FaEdit, FaTrash, FaUsers } from 'react-icons/fa';
import Modal from '../components/shared/Modal';
import TenantForm from '../components/forms/TenantForm';

export default function TenantsPage() {
  const { tenants, buildings, deleteTenant } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [selectedBuildingId, setSelectedBuildingId] = useState('all');

  const filteredTenants = useMemo(() => {
    if (selectedBuildingId === 'all') return tenants;
    return tenants.filter((tenant) => String(tenant.building_id) === selectedBuildingId);
  }, [tenants, selectedBuildingId]);

  const handleEdit = (tenant) => {
    setEditingTenant(tenant);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTenant(null);
  };

  const handleDelete = async (tenant) => {
    if (confirm(`האם אתה בטוח שברצונך למחוק את הדייר "${tenant.name}"?`)) {
      try {
        await deleteTenant(tenant.id);
      } catch (error) {
        alert('שגיאה: ' + error.message);
      }
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">דיירים</h1>
          <p className="text-gray-600 mt-1">ניהול דיירים לפי מבנים, דירות וקומות</p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedBuildingId}
            onChange={(e) => setSelectedBuildingId(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 min-h-[44px]"
          >
            <option value="all">כל המבנים</option>
            {buildings.map((building) => (
              <option key={building.id} value={building.id}>{building.name}</option>
            ))}
          </select>

          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-orange-600 flex items-center gap-2"
          >
            <FaPlus />
            הוסף דייר
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredTenants.length === 0 ? (
          <div className="col-span-full bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
            אין דיירים להצגה. לחץ על "הוסף דייר" כדי להתחיל
          </div>
        ) : (
          filteredTenants.map((tenant) => (
            <div key={tenant.id} className="bg-white rounded-lg shadow-md p-5 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-primary bg-opacity-10 p-3 rounded-lg">
                    <FaUsers className="text-2xl text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">{tenant.name}</h3>
                    <p className="text-sm text-gray-600">{tenant.building_name || 'ללא מבנה'}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => handleEdit(tenant)} className="text-blue-500 hover:text-blue-600 p-1" title="ערוך">
                    <FaEdit />
                  </button>
                  <button onClick={() => handleDelete(tenant)} className="text-red-500 hover:text-red-600 p-1" title="מחק">
                    <FaTrash />
                  </button>
                </div>
              </div>

              <div className="mt-4 text-sm text-gray-700 space-y-1">
                <div><span className="font-semibold">דירה:</span> {tenant.apartment_number}</div>
                <div><span className="font-semibold">קומה:</span> {tenant.floor}</div>
                {tenant.phone && <div><span className="font-semibold">טלפון:</span> {tenant.phone}</div>}
                {tenant.email && <div><span className="font-semibold">אימייל:</span> {tenant.email}</div>}
                {tenant.notes && <div><span className="font-semibold">הערות:</span> {tenant.notes}</div>}
              </div>
            </div>
          ))
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingTenant ? 'ערוך דייר' : 'דייר חדש'}
      >
        <TenantForm tenant={editingTenant} onClose={handleCloseModal} />
      </Modal>
    </div>
  );
}
