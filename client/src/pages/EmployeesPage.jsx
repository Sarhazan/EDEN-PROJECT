import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';
import { FaPlus, FaEdit, FaTrash, FaUserTie, FaUserShield } from 'react-icons/fa';
import Modal from '../components/shared/Modal';
import EmployeeForm from '../components/forms/EmployeeForm';

// Circular Progress Component
function CircularProgress({ percentage = 0, size = 120 }) {
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Color based on percentage
  const getColor = () => {
    if (percentage >= 80) return '#10b981'; // green-500
    if (percentage >= 50) return '#f59e0b'; // amber-500
    return '#ef4444'; // red-500
  };

  const color = getColor();

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth="10"
          fill="none"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth="10"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      {/* Percentage text in center */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold" style={{ color }}>
          {Math.round(percentage)}%
        </span>
        <span className="text-xs text-gray-500 mt-1">בזמן</span>
      </div>
    </div>
  );
}

export default function EmployeesPage() {
  const { employees, deleteEmployee } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [managerEmployeeId, setManagerEmployeeId] = useState(null);

  useEffect(() => {
    axios.get(`${API_URL}/accounts/settings/manager_employee_id`)
      .then(res => { if (res.data.value) setManagerEmployeeId(Number(res.data.value)); })
      .catch(() => {});
  }, []);

  // Debug: Log employees when they change
  console.log('[DEBUG EmployeesPage] Rendering with employees:', employees);
  console.log('[DEBUG EmployeesPage] First employee:', employees[0]);

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

  const isManagerEmployee = (employee) => {
    if (!managerEmployeeId) return false;
    return Number(employee.id) === managerEmployeeId;
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-xl font-bold">{employee.name}</h3>
                {isManagerEmployee(employee) && (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-indigo-100 text-indigo-700"
                    title="מנהל מתחם"
                  >
                    <FaUserShield className="text-[11px]" />
                    מנהל
                  </span>
                )}
              </div>
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

              <div className="border-t pt-4 mt-4">
                {/* Circular Progress */}
                <div className="flex justify-center mb-4">
                  <CircularProgress
                    percentage={employee.stats?.on_time_percentage || 0}
                  />
                </div>

                {/* Task Statistics */}
                <div className="grid grid-cols-2 gap-2 text-center text-sm">
                  <div className="bg-gray-50 rounded-lg p-2">
                    <div className="text-2xl font-bold text-green-600">
                      {employee.stats?.completed_on_time || 0}
                    </div>
                    <div className="text-xs text-gray-600">בזמן</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <div className="text-2xl font-bold text-red-600">
                      {employee.stats?.completed_late || 0}
                    </div>
                    <div className="text-xs text-gray-600">באיחור</div>
                  </div>
                </div>

                {/* Total Tasks */}
                <div className="mt-2 text-center text-xs text-gray-500">
                  סה"כ {employee.stats?.completed_tasks || 0} משימות הושלמו
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