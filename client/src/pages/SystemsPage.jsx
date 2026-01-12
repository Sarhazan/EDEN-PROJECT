import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { FaPlus, FaEdit, FaTrash, FaCog } from 'react-icons/fa';
import Modal from '../components/shared/Modal';
import SystemForm from '../components/forms/SystemForm';

export default function SystemsPage() {
  const { systems, deleteSystem } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSystem, setEditingSystem] = useState(null);

  const handleEdit = (system) => {
    setEditingSystem(system);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSystem(null);
  };

  const handleDelete = async (id, name) => {
    if (confirm(`האם אתה בטוח שברצונך למחוק את המערכת "${name}"?`)) {
      try {
        await deleteSystem(id);
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
          <h1 className="text-3xl font-bold">מערכות תחזוקה</h1>
          <p className="text-gray-600 mt-1">ניהול מערכות המבנים והגורמים שלהן</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-orange-600 flex items-center gap-2"
        >
          <FaPlus />
          הוסף מערכת
        </button>
      </div>

      {/* Systems Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {systems.length === 0 ? (
          <div className="col-span-full bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
            אין מערכות. לחץ על "הוסף מערכת" כדי להתחיל
          </div>
        ) : (
          systems.map((system) => (
            <div
              key={system.id}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-primary bg-opacity-10 p-3 rounded-lg">
                    <FaCog className="text-2xl text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{system.name}</h3>
                    <p className="text-sm text-gray-600">
                      {system.active_tasks_count || 0} משימות פעילות
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(system)}
                    className="text-blue-500 hover:text-blue-600 p-1"
                    title="ערוך"
                  >
                    <FaEdit />
                  </button>
                  <button
                    onClick={() => handleDelete(system.id, system.name)}
                    className="text-red-500 hover:text-red-600 p-1"
                    title="מחק"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>

              {system.description && (
                <p className="text-gray-600 text-sm mb-3">{system.description}</p>
              )}

              {system.contact_person && (
                <div className="text-sm text-gray-600 space-y-1">
                  <p>👤 {system.contact_person}</p>
                  {system.phone && <p>📞 {system.phone}</p>}
                  {system.email && <p>📧 {system.email}</p>}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* System Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingSystem ? 'ערוך מערכת' : 'מערכת חדשה'}
      >
        <SystemForm system={editingSystem} onClose={handleCloseModal} />
      </Modal>
    </div>
  );
}
