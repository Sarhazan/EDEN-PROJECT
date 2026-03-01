import { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import axios from 'axios';

import { API_URL, LS_KEYS } from '../config';
import { FaPlus, FaEdit, FaTrash, FaUserTie, FaUserShield, FaCalendarAlt, FaTimes, FaExclamationTriangle, FaClock } from 'react-icons/fa';
import Modal from '../components/shared/Modal';
import EmployeeForm from '../components/forms/EmployeeForm';
import EmployeeCalendarModal from '../components/employees/EmployeeCalendarModal';

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
  const { employees, deleteEmployee, tasks } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [managerEmployeeId, setManagerEmployeeId] = useState(null);
  const [calendarEmployee, setCalendarEmployee] = useState(null);
  const [activePopup, setActivePopup] = useState(null); // null | { employeeId, type: 'late' | 'not_completed', anchorRect }
  const popupRef = useRef(null);

  useEffect(() => {
    const cached = localStorage.getItem(LS_KEYS.MANAGER_EMPLOYEE_ID);
    if (cached) setManagerEmployeeId(Number(cached));

    axios.get(`${API_URL}/accounts/settings/manager_employee_id`)
      .then(res => { if (res.data.value) setManagerEmployeeId(Number(res.data.value)); })
      .catch(() => {});

    const handleManagerChanged = (e) => {
      setManagerEmployeeId(e.detail?.id ? Number(e.detail.id) : null);
    };
    window.addEventListener('manager:changed', handleManagerChanged);
    return () => window.removeEventListener('manager:changed', handleManagerChanged);
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        setActivePopup(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [popupRef]);

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

  const handleStatClick = (e, employeeId, type, count) => {
    e.stopPropagation();
    if (count === 0) return;
    
    if (activePopup && activePopup.employeeId === employeeId && activePopup.type === type) {
      setActivePopup(null);
    } else {
      setActivePopup({ employeeId, type });
    }
  };

  const todayStr = new Date().toISOString().slice(0, 10);

  const formatLateTime = (minutes) => {
    if (minutes < 60) return `${minutes} דקות איחור`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hours} שעות איחור`;
    return `${hours} שעות ${mins} דקות איחור`;
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
          employees.map((employee) => {
            // Today's tasks: exclude tasks whose due_date is in the future
            const todayTasks = (tasks || []).filter(t =>
              t.employee_id === employee.id &&
              t.start_date === todayStr &&
              (!t.due_date || t.due_date <= todayStr)
            );

            // Future due-date tasks: assigned to employee, not yet done, due later
            const futureDueTasks = (tasks || []).filter(t =>
              t.employee_id === employee.id &&
              t.due_date && t.due_date > todayStr &&
              !['completed', 'not_completed'].includes(t.status)
            );

            const notCompletedList = todayTasks.filter(t => t.status === 'not_completed');
            const lateList        = todayTasks.filter(t => t.status === 'completed' && t.time_delta_minutes > 0);
            const completedToday  = todayTasks.filter(t => t.status === 'completed');
            const onTimeToday     = completedToday.filter(t => !t.time_delta_minutes || t.time_delta_minutes <= 0);
            
            return (
            <div
              key={employee.id}
              className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow relative"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-primary bg-opacity-10 p-3 rounded-lg">
                    <FaUserTie className="text-2xl text-primary" />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setCalendarEmployee(employee)}
                    className="text-indigo-500 hover:text-indigo-600 p-1"
                    title="יומן עובד"
                  >
                    <FaCalendarAlt />
                  </button>
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

              <div className="border-t pt-4 mt-4 relative">
                {/* Today tasks badge + breakdown */}
                <div className="flex flex-col items-center gap-1 mb-4">
                  <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                    📋 {todayTasks.length} משימות היום
                  </span>
                  {todayTasks.length > 0 && (
                    <div className="flex gap-3 text-xs text-gray-500 mt-0.5">
                      <span className="text-emerald-600 font-medium">{completedToday.length} בוצעו</span>
                      <span className="text-gray-300">|</span>
                      <span className="text-green-500">{onTimeToday.length} בזמן</span>
                      <span className="text-gray-300">|</span>
                      <span className="text-orange-500">{lateList.length} באיחור</span>
                    </div>
                  )}
                </div>

                {/* Future due-date tasks */}
                {futureDueTasks.length > 0 && (
                  <div className="mb-4 bg-amber-50 border border-amber-100 rounded-lg p-3">
                    <div className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-1">
                      🗓 {futureDueTasks.length} משימות ממתינות
                    </div>
                    <ul className="space-y-1">
                      {futureDueTasks.map(t => {
                        const [y, m, d] = t.due_date.split('-');
                        return (
                          <li key={t.id} className="flex justify-between items-center text-xs">
                            <span className="text-gray-700 truncate max-w-[60%]">{t.title}</span>
                            <span className="text-amber-600 font-medium whitespace-nowrap">עד {d}/{m}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {/* Circular Progress */}
                <div className="flex justify-center mb-4">
                  <CircularProgress
                    percentage={employee.stats?.on_time_percentage || 0}
                  />
                </div>

                {/* Task Statistics */}
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div className="bg-gray-50 rounded-lg p-2">
                    <div className="text-2xl font-bold text-green-600">
                      {employee.stats?.completed_on_time || 0}
                    </div>
                    <div className="text-xs text-gray-600">בזמן</div>
                  </div>
                  
                  <div 
                    className={`bg-orange-50 rounded-lg p-2 border border-orange-100 relative ${lateList.length > 0 ? 'cursor-pointer hover:bg-orange-100 transition-colors' : ''}`}
                    onClick={(e) => handleStatClick(e, employee.id, 'late', lateList.length)}
                  >
                    <div className="text-2xl font-bold text-orange-600">
                      {lateList.length}
                    </div>
                    <div className="text-xs text-orange-700">באיחור (היום)</div>
                    
                    {activePopup && activePopup.employeeId === employee.id && activePopup.type === 'late' && (
                        <div ref={popupRef} className="absolute z-50 top-full mt-2 left-1/2 -translate-x-1/2 w-[280px] max-w-[calc(100vw-40px)] bg-white rounded-xl shadow-xl border border-gray-100 text-right overflow-hidden cursor-default" onClick={e => e.stopPropagation()} dir="rtl">
                            <div className="bg-orange-50 px-4 py-2 border-b border-orange-100 flex justify-between items-center">
                                <span className="font-bold text-orange-800 text-sm">משימות באיחור</span>
                                <button onClick={(e) => { e.stopPropagation(); setActivePopup(null); }} className="text-gray-400 hover:text-gray-600"><FaTimes /></button>
                            </div>
                            <div className="max-h-[300px] overflow-y-auto p-2">
                                {lateList.length === 0 ? (
                                    <div className="text-center text-gray-500 py-4 text-sm">אין משימות באיחור היום ✓</div>
                                ) : (
                                    <ul className="space-y-2">
                                        {lateList.map(t => (
                                            <li key={t.id} className="text-sm p-2 bg-gray-50 rounded-lg">
                                                <div className="font-semibold text-gray-800">{t.title}</div>
                                                <div className="flex justify-between items-center mt-1">
                                                    <span className="text-xs text-gray-500">{t.start_time}</span>
                                                    <span className="text-xs font-medium text-orange-600 flex items-center gap-1"><FaClock className="text-[10px]"/> {formatLateTime(t.time_delta_minutes)}</span>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    )}
                  </div>
                  
                  <div 
                    className={`bg-red-50 rounded-lg p-2 border border-red-100 relative ${notCompletedList.length > 0 ? 'cursor-pointer hover:bg-red-100 transition-colors' : ''}`}
                    onClick={(e) => handleStatClick(e, employee.id, 'not_completed', notCompletedList.length)}
                  >
                    <div className="text-2xl font-bold text-red-700">
                      {notCompletedList.length}
                    </div>
                    <div className="text-xs text-red-700">לא בוצע (היום)</div>
                    
                    {activePopup && activePopup.employeeId === employee.id && activePopup.type === 'not_completed' && (
                        <div ref={popupRef} className="absolute z-50 top-full mt-2 left-1/2 -translate-x-1/2 w-[280px] max-w-[calc(100vw-40px)] bg-white rounded-xl shadow-xl border border-gray-100 text-right overflow-hidden cursor-default" onClick={e => e.stopPropagation()} dir="rtl">
                            <div className="bg-red-50 px-4 py-2 border-b border-red-100 flex justify-between items-center">
                                <span className="font-bold text-red-800 text-sm">משימות שלא בוצעו</span>
                                <button onClick={(e) => { e.stopPropagation(); setActivePopup(null); }} className="text-gray-400 hover:text-gray-600"><FaTimes /></button>
                            </div>
                            <div className="max-h-[300px] overflow-y-auto p-2">
                                {notCompletedList.length === 0 ? (
                                    <div className="text-center text-gray-500 py-4 text-sm">אין משימות שלא בוצעו היום ✓</div>
                                ) : (
                                    <ul className="space-y-2">
                                        {notCompletedList.map(t => (
                                            <li key={t.id} className="text-sm p-2 bg-gray-50 rounded-lg">
                                                <div className="flex items-start gap-2">
                                                    <FaExclamationTriangle className="text-red-500 mt-0.5 shrink-0" />
                                                    <div>
                                                        <div className="font-semibold text-gray-800">{t.title}</div>
                                                        {t.start_time && <div className="text-xs text-gray-500 mt-0.5">{t.start_time}</div>}
                                                    </div>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    )}
                  </div>
                </div>

                {/* Total Tasks */}
                <div className="mt-2 text-center text-xs text-gray-500">
                  סה"כ {employee.stats?.completed_tasks || 0} משימות הושלמו (כולל)
                </div>
              </div>
            </div>
          )})
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

      {calendarEmployee && (
        <EmployeeCalendarModal
          employee={calendarEmployee}
          isOpen={!!calendarEmployee}
          onClose={() => setCalendarEmployee(null)}
        />
      )}
    </div>
  );
}
