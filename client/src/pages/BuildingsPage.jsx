import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { FaPlus, FaEdit, FaTrash, FaBuilding } from 'react-icons/fa';
import Modal from '../components/shared/Modal';
import BuildingForm from '../components/forms/BuildingForm';

export default function BuildingsPage() {
  const { buildings, deleteBuilding } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState(null);

  const handleEdit = (building) => {
    setEditingBuilding(building);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingBuilding(null);
  };

  const handleDelete = async (id, name) => {
    if (confirm(`האם אתה בטוח שברצונך למחוק את המבנה "${name}"?`)) {
      try {
        await deleteBuilding(id);
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
          <h1 className="text-3xl font-bold">מבני אחזקה</h1>
          <p className="text-gray-600 mt-1">ניהול מבני האחזקה</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-orange-600 flex items-center gap-2"
        >
          <FaPlus />
          הוסף מבנה
        </button>
      </div>

      {/* Buildings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {buildings.length === 0 ? (
          <div className="col-span-full bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
            אין מבנים. לחץ על "הוסף מבנה" כדי להתחיל
          </div>
        ) : (
          buildings.map((building) => (
            <div
              key={building.id}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-primary bg-opacity-10 p-3 rounded-lg">
                    <FaBuilding className="text-2xl text-primary" />
                  </div>
                  <h3 className="text-xl font-bold">{building.name}</h3>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(building)}
                    className="text-blue-500 hover:text-blue-600 p-1"
                    title="ערוך"
                  >
                    <FaEdit />
                  </button>
                  <button
                    onClick={() => handleDelete(building.id, building.name)}
                    className="text-red-500 hover:text-red-600 p-1"
                    title="מחק"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Building Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingBuilding ? 'ערוך מבנה' : 'מבנה חדש'}
      >
        <BuildingForm building={editingBuilding} onClose={handleCloseModal} />
      </Modal>
    </div>
  );
}
