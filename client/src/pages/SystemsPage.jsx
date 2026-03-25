import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { FaPlus, FaEdit, FaTrash, FaCog } from 'react-icons/fa';
import Modal from '../components/shared/Modal';
import SystemForm from '../components/forms/SystemForm';
import SystemDetailModal from '../components/units/SystemDetailModal';
import { API_URL } from '../config';

export default function SystemsPage() {
  const { systems, deleteSystem } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSystem, setEditingSystem] = useState(null);
  const [selectedSystem, setSelectedSystem] = useState(null);
  const [unitSummary, setUnitSummary] = useState({});

  useEffect(() => {
    const loadSummary = async () => {
      try {
        const response = await fetch(`${API_URL}/units`);
        const allUnits = await response.json();
        const summary = {};
        for (const unit of allUnits) {
          if (!summary[unit.system_id]) {
            summary[unit.system_id] = { total: 0, needsAttention: 0 };
          }
          summary[unit.system_id].total++;
          if (unit.status === 'overdue' || unit.status === 'needs_inspection') {
            summary[unit.system_id].needsAttention++;
          }
        }
        setUnitSummary(summary);
      } catch (error) {
        console.error('Error loading unit summary:', error);
      }
    };
    loadSummary();
  }, [systems]);

  const handleEdit = (e, system) => {
    e.stopPropagation();
    setEditingSystem(system);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSystem(null);
  };

  const handleDelete = async (e, id, name) => {
    e.stopPropagation();
    if (confirm(`האם אתה בטוח שברצונך למחוק את המערכת "${name}"?`)) {
      try {
        await deleteSystem(id);
      } catch (error) {
        alert('שגיאה: ' + error.message);
      }
    }
  };

  const handleOpenUnits = (e, system) => {
    e.stopPropagation();
    setSelectedSystem(system);
  };

  // Called from SystemForm when user clicks "יחידות"
  const handleOpenUnitsFromForm = (system) => {
    setIsModalOpen(false);
    setEditingSystem(null);
    setSelectedSystem(system);
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
          systems.map((system) => {
            const summary = unitSummary[system.id];
            return (
              <div
                key={system.id}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {/* Gear = open units modal */}
                    <button
                      onClick={(e) => handleOpenUnits(e, system)}
                      className="bg-primary bg-opacity-10 p-3 rounded-lg hover:bg-opacity-20 transition-colors"
                      title="ניהול יחידות"
                    >
                      <FaCog className="text-2xl text-primary" />
                    </button>
                    <div>
                      <h3 className="text-xl font-bold">{system.name}</h3>
                      <p className="text-sm text-gray-600">
                        {system.active_tasks_count || 0} משימות פעילות
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={(e) => handleEdit(e, system)}
                      className="text-blue-500 hover:text-blue-600 p-1"
                      title="ערוך מערכת"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, system.id, system.name)}
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

                {/* Unit summary */}
                {summary && summary.total > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-3 text-sm">
                    <span className="text-gray-600">{summary.total} יחידות</span>
                    {summary.needsAttention > 0 && (
                      <span className="text-orange-600 font-medium bg-orange-50 px-2 py-0.5 rounded-full text-xs">
                        {summary.needsAttention} צריכות טיפול
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* System Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingSystem ? 'ערוך מערכת' : 'מערכת חדשה'}
      >
        <SystemForm
          system={editingSystem}
          onClose={handleCloseModal}
          onOpenUnits={editingSystem ? () => handleOpenUnitsFromForm(editingSystem) : null}
        />
      </Modal>

      {/* System Detail Modal */}
      <SystemDetailModal
        system={selectedSystem}
        isOpen={!!selectedSystem}
        onClose={() => setSelectedSystem(null)}
      />
    </div>
  );
}
