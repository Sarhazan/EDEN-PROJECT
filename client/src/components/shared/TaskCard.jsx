import { useState } from 'react';
import { FaEdit, FaTrash, FaPaperPlane, FaRedo, FaCheck } from 'react-icons/fa';
import { useApp } from '../../context/AppContext';
import { format } from 'date-fns';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const priorityColors = {
  urgent: 'bg-red-100 text-red-800',
  normal: 'bg-blue-100 text-blue-800',
  optional: 'bg-green-100 text-green-800'
};

const priorityLabels = {
  urgent: 'דחוף',
  normal: 'רגיל',
  optional: 'עדיפות נמוכה'
};

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-orange-100 text-orange-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800'
};

const statusLabels = {
  draft: 'חדש',
  sent: 'נשלח',
  in_progress: 'בביצוע',
  completed: 'הושלם'
};

const frequencyLabels = {
  'one-time': 'חד-פעמי',
  'daily': 'יומי',
  'weekly': 'שבועי',
  'biweekly': 'שבועיים',
  'monthly': 'חודשי',
  'semi-annual': 'חצי שנתי',
  'annual': 'שנתי'
};

export default function TaskCard({ task, onEdit }) {
  const { updateTaskStatus, deleteTask, updateTask, employees } = useApp();
  const [isChangingEmployee, setIsChangingEmployee] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const handleCheckbox = async () => {
    const newStatus = task.status === 'completed' ? 'draft' : 'completed';
    try {
      await updateTaskStatus(task.id, newStatus);
    } catch (error) {
      alert('שגיאה: ' + error.message);
    }
  };

  const handleSendTask = async () => {
    // Check if employee exists
    if (!task.employee_id || !task.employee_name) {
      alert('לא ניתן לשלוח משימה ללא עובד משוייך');
      return;
    }

    // Get employee data to get phone number
    const employee = employees.find(emp => emp.id === task.employee_id);

    if (!employee || !employee.phone) {
      alert('לעובד אין מספר טלפון. אנא הוסף מספר טלפון בפרטי העובד');
      return;
    }

    setIsSending(true);

    try {
      // Format the WhatsApp message
      const message = `${task.start_time}\n${task.title}\n${task.description || ''}`;

      // Send WhatsApp message
      await axios.post(`${API_URL}/api/whatsapp/send`, {
        phoneNumber: employee.phone,
        message: message
      });

      // Update task status to 'sent'
      await updateTaskStatus(task.id, 'sent');

      alert('המשימה נשלחה בהצלחה בוואטסאפ!');
    } catch (error) {
      alert('שגיאה: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = async () => {
    if (confirm('האם אתה בטוח שברצונך למחוק משימה זו?')) {
      try {
        await deleteTask(task.id);
      } catch (error) {
        alert('שגיאה: ' + error.message);
      }
    }
  };

  const handleEmployeeChange = async (e) => {
    const newEmployeeId = e.target.value ? parseInt(e.target.value) : null;
    try {
      await updateTask(task.id, { ...task, employee_id: newEmployeeId });
      setIsChangingEmployee(false);
    } catch (error) {
      alert('שגיאה: ' + error.message);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={task.status === 'completed'}
          onChange={handleCheckbox}
          className="mt-1 w-5 h-5 cursor-pointer"
        />

        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-lg font-semibold">{task.title}</h3>
            <div className="flex gap-2 items-center">
              {task.status === 'sent' && task.sent_at && (
                <div className="flex items-center gap-1 text-green-600 text-sm">
                  <FaCheck />
                  <span className="font-semibold">נשלח</span>
                  <span className="text-gray-500">
                    {new Date(task.sent_at).toLocaleTimeString('he-IL', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              )}
              {task.status === 'draft' && task.employee_id && (
                <button
                  onClick={handleSendTask}
                  disabled={isSending}
                  className="text-primary hover:text-orange-600 p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="שלח משימה בוואטסאפ"
                >
                  {isSending ? '...' : <FaPaperPlane />}
                </button>
              )}
              <button
                onClick={() => onEdit(task)}
                className="text-blue-500 hover:text-blue-600 p-1"
                title="ערוך"
              >
                <FaEdit />
              </button>
              <button
                onClick={handleDelete}
                className="text-red-500 hover:text-red-600 p-1"
                title="מחק"
              >
                <FaTrash />
              </button>
            </div>
          </div>

          {task.description && (
            <p className="text-gray-600 text-sm mb-2">{task.description}</p>
          )}

          <div className="flex flex-wrap gap-2 mb-2">
            <span className={`px-3 py-1 rounded-full text-sm ${priorityColors[task.priority]}`}>
              {priorityLabels[task.priority]}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm ${statusColors[task.status]}`}>
              {statusLabels[task.status]}
            </span>
            {task.system_name && (
              <span className="px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800">
                {task.system_name}
              </span>
            )}
            {task.frequency && (
              <span className="px-3 py-1 rounded-full text-sm bg-indigo-100 text-indigo-800 flex items-center gap-1">
                {task.is_recurring === 1 && <FaRedo className="text-xs" />}
                {frequencyLabels[task.frequency] || task.frequency}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              <span>📅 {format(new Date(task.start_date), 'dd/MM/yyyy')}</span>
              <span className="mr-3">🕐 {task.start_time}</span>
            </div>

            {isChangingEmployee ? (
              <select
                value={task.employee_id || ''}
                onChange={handleEmployeeChange}
                onBlur={() => setIsChangingEmployee(false)}
                className="border rounded px-2 py-1 text-sm"
                autoFocus
              >
                <option value="">ללא עובד</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            ) : (
              <span
                onClick={() => setIsChangingEmployee(true)}
                className="cursor-pointer hover:text-primary"
              >
                👤 {task.employee_name || 'ללא עובד'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
