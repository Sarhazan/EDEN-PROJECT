import { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { FaPlus, FaEdit } from 'react-icons/fa';
import Modal from '../shared/Modal';
import UnitCard from './UnitCard';
import UnitForm from './UnitForm';
import SystemForm from '../forms/SystemForm';
import { API_URL } from '../../config';

export default function SystemDetailModal({ system, isOpen, onClose, openAddUnit = false }) {
  const { deleteUnit, deleteUnitFile } = useApp();
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);

  // פתח טופס הוספה מיד אם התבקש
  useEffect(() => {
    if (isOpen && openAddUnit) {
      setShowUnitForm(true);
      setEditingUnit(null);
    }
  }, [isOpen, openAddUnit]);
  const [showSystemEdit, setShowSystemEdit] = useState(false);
  const systemIdRef = useRef(system?.id);
  systemIdRef.current = system?.id;

  const loadUnits = useCallback(async () => {
    const id = systemIdRef.current;
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/units?system_id=${id}`);
      const data = await res.json();
      setUnits(data);
    } catch (error) {
      console.error('Error loading units:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && system?.id) {
      loadUnits();
    } else if (!isOpen) {
      setUnits([]);
      setLoading(true);
    }
  }, [isOpen, system?.id, loadUnits]);

  const handleEditUnit = (unit) => {
    setEditingUnit(unit);
    setShowUnitForm(true);
  };

  const handleDeleteUnit = async (unitId) => {
    await deleteUnit(unitId);
    await loadUnits();
  };

  const handleDeleteFile = async (unitId, fileId) => {
    await deleteUnitFile(unitId, fileId);
    await loadUnits();
  };

  const handleUnitFormClose = () => {
    setShowUnitForm(false);
    setEditingUnit(null);
  };

  const handleUnitSaved = () => {
    loadUnits();
  };

  const handleSystemEditClose = () => {
    setShowSystemEdit(false);
  };

  if (!system) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={system.name}
      headerAction={
        <button
          onClick={() => { setEditingUnit(null); setShowUnitForm(true); }}
          className="bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-orange-600 flex items-center gap-1.5 text-sm"
        >
          <FaPlus size={12} />
          הוסף יחידה
        </button>
      }
    >
      <div className="space-y-6">
        {/* System details */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg">פרטי מערכת</h3>
            <button
              onClick={() => setShowSystemEdit(true)}
              className="text-blue-500 hover:text-blue-600 p-1.5 rounded hover:bg-blue-50 flex items-center gap-1 text-sm"
            >
              <FaEdit size={12} />
              ערוך
            </button>
          </div>
          {system.description && <p className="text-sm text-gray-600">{system.description}</p>}
          <div className="text-sm text-gray-600 space-y-1">
            {system.contact_person && <p>איש קשר: {system.contact_person}</p>}
            {system.phone && <p>טלפון: {system.phone}</p>}
            {system.email && <p>אימייל: {system.email}</p>}
          </div>
        </div>

        {/* Units section */}
        <div>
          <div className="mb-3">
            <h3 className="font-bold text-lg">יחידות ({units.length})</h3>
          </div>

          {loading ? (
            <p className="text-gray-500 text-center py-4">טוען...</p>
          ) : units.length === 0 ? (
            <p className="text-gray-500 text-center py-6 bg-gray-50 rounded-lg">
              אין יחידות במערכת זו. לחץ על "הוסף יחידה" כדי להתחיל
            </p>
          ) : (
            <div className="space-y-3">
              {units.map(unit => (
                <UnitCard
                  key={unit.id}
                  unit={unit}
                  onEdit={handleEditUnit}
                  onDelete={handleDeleteUnit}
                  onDeleteFile={handleDeleteFile}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Nested unit form modal */}
      {showUnitForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 md:p-4 animate-fade-in">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={handleUnitFormClose}
          />
          <div className="relative bg-white w-full h-full max-w-full max-h-full rounded-none shadow-2xl overflow-hidden flex flex-col md:max-w-lg md:max-h-[85vh] md:rounded-2xl">
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-4 py-4 md:px-6 md:py-4 flex items-center justify-between flex-shrink-0">
              <h3 className="text-lg font-bold">
                {editingUnit ? 'ערוך יחידה' : 'יחידה חדשה'}
              </h3>
              <button
                onClick={handleUnitFormClose}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                &times;
              </button>
            </div>
            <div className="p-4 md:p-6 overflow-y-auto flex-1">
              <UnitForm
                unit={editingUnit}
                systemId={system.id}
                onClose={handleUnitFormClose}
                onSaved={handleUnitSaved}
              />
            </div>
          </div>
        </div>
      )}

      {/* Nested system edit modal */}
      {showSystemEdit && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 md:p-4 animate-fade-in">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={handleSystemEditClose}
          />
          <div className="relative bg-white w-full h-full max-w-full max-h-full rounded-none shadow-2xl overflow-hidden flex flex-col md:max-w-lg md:max-h-[85vh] md:rounded-2xl">
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-4 py-4 md:px-6 md:py-4 flex items-center justify-between flex-shrink-0">
              <h3 className="text-lg font-bold">ערוך מערכת</h3>
              <button
                onClick={handleSystemEditClose}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                &times;
              </button>
            </div>
            <div className="p-4 md:p-6 overflow-y-auto flex-1">
              <SystemForm system={system} onClose={handleSystemEditClose} />
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
