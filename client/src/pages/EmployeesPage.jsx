import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { FaPlus, FaEdit, FaTrash, FaUserTie } from 'react-icons/fa';
import Modal from '../components/shared/Modal';
import EmployeeForm from '../components/forms/EmployeeForm';

export default function EmployeesPage() {
  const { employees, deleteEmployee } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEmployee(null);
  };

  const handleDelete = async (id, name) => {
    if (confirm(`האם אתה בטוח שברצונך למחוק את העובד "${name}"?`)) {
      try {
        await deleteEmployee(id);
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
          <h1 className="text-3xl font-bold">צוות עובדים</h1>
          <p className="text-gray-600 mt-1">ניהול עובדים ושיוך משימות</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-orange-600 flex items-center gap-2"
        >
          <FaPlus />
          הוסף עובד
        </button>
      </div>

      {/* Employees Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {employees.length === 0 ? (
          <div className="col-span-full bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
            אין עובדים. לחץ על "הוסף עובד" כדי להתחיל
          </div>
        ) : (
          employees.map((employee) => (
            <div
              key={employee.id}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-primary bg-opacity-10 p-3 rounded-lg">
                    <FaUserTie className="text-2xl text-primary" />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(employee)}
                    className="text-blue-500 hover:text-blue-600 p-1"
                    title="ערוך"
                  >
                    <FaEdit />
                  </button>
                  <button
                    onClick={() => handleDelete(employee.id, employee.name)}
                    className="text-red-500 hover:text-red-600 p-1"
                    title="מחק"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>

              <h3 className="text-xl font-bold mb-1">{employee.name}</h3>
              {employee.position && (
                <p className="text-sm text-gray-600 mb-3">{employee.position}</p>
              )}

              {employee.phone && (
                <p className="text-sm text-gray-600 mb-3">📞 {employee.phone}</p>
              )}

              <div className="text-sm text-gray-600 mb-3">
                <span className="font-medium">שפה:</span>{' '}
                {employee.language === 'he' && '🇮🇱 עברית'}
                {employee.language === 'en' && '🇬🇧 English'}
                {employee.language === 'ru' && '🇷🇺 Русский'}
                {employee.language === 'ar' && '🇸🇦 العربية'}
                {!employee.language && '🇮🇱 עברית'}
              </div>

              <div className="border-t pt-3 mt-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">משימות פעילות:</span>
                  <span className="text-2xl font-bold text-primary">
                    {employee.active_tasks_count || 0}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Employee Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingEmployee ? 'ערוך עובד' : 'עובד חדש'}
      >
        <EmployeeForm employee={editingEmployee} onClose={handleCloseModal} />
      </Modal>
    </div>
  );
}
