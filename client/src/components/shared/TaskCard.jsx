import { useState } from 'react';
import { FaEdit, FaTrash, FaPaperPlane, FaRedo, FaCheck } from 'react-icons/fa';
import { useApp } from '../../context/AppContext';
import { format } from 'date-fns';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const priorityColors = {
  urgent: 'bg-rose-50 text-rose-700',
  normal: 'bg-indigo-50 text-indigo-700',
  optional: 'bg-sky-50 text-sky-700'
};

const priorityLabels = {
  urgent: 'דחוף',
  normal: 'רגיל',
  optional: 'עדיפות נמוכה'
};

const statusColors = {
  draft: 'bg-slate-50 text-slate-700',
  sent: 'bg-amber-50 text-amber-700',
  received: 'bg-teal-50 text-teal-700',
  in_progress: 'bg-blue-50 text-blue-700',
  completed: 'bg-emerald-50 text-emerald-700'
};

const statusLabels = {
  draft: 'חדש',
  sent: 'נשלח',
  received: 'התקבל',
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
  const [lightboxImage, setLightboxImage] = useState(null);

  // Check if task time is in the future
  const isTaskInFuture = () => {
    const now = new Date();

    // For recurring tasks, only check if the time today is in the future
    if (task.is_recurring === 1) {
      const today = now.toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
      const taskDateTimeToday = new Date(`${today}T${task.start_time}`);
      return taskDateTimeToday > now;
    }

    // For one-time tasks, check the actual date and time
    const taskDateTime = new Date(`${task.start_date}T${task.start_time}`);
    return taskDateTime > now;
  };

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
    <div className={`
      bg-white rounded-xl shadow-md p-5
      transition-all duration-200
      hover:shadow-lg hover:-translate-y-1 hover:scale-[1.01]
      ${task.status === 'completed' ? 'opacity-70' : ''}
      ${task.priority === 'urgent' ? 'border-r-4 border-rose-500' : ''}
    `}>
      <div className="flex items-start gap-4">
        <div className="relative flex-shrink-0">
          <input
            type="checkbox"
            checked={task.status === 'completed'}
            onChange={handleCheckbox}
            className={`
              w-6 h-6 cursor-pointer appearance-none
              border-2 rounded-md
              transition-all duration-200
              checked:scale-110
              ${task.status === 'completed'
                ? 'bg-primary border-primary'
                : 'border-gray-300'
              }
            `}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-3">
            <h3 className={`
              text-lg font-semibold text-gray-900 leading-snug
              ${task.status === 'completed' ? 'line-through' : ''}
            `}>
              {task.title}
            </h3>

            <div className="flex gap-2 items-start flex-shrink-0">
              {(task.status === 'sent' || task.status === 'received') && task.sent_at && (
                <div className="flex flex-col gap-1">
                  {/* נשלח - תמיד מוצג כשיש sent_at */}
                  <div className="flex items-center gap-1 text-sm text-emerald-600">
                    <FaCheck />
                    <span className="font-semibold">נשלח</span>
                    <span className="text-gray-500">
                      {new Date(task.sent_at).toLocaleTimeString('he-IL', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>

                  {/* התקבל - מוצג רק כש-status = 'received' */}
                  {task.status === 'received' && task.acknowledged_at && (
                    <div className="flex items-center gap-1 text-sm bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full font-semibold">
                      <FaCheck />
                      <span className="font-semibold">התקבל</span>
                      <span className="text-gray-500">
                        {new Date(task.acknowledged_at).toLocaleTimeString('he-IL', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  )}
                </div>
              )}
              {task.status === 'draft' && task.employee_id && isTaskInFuture() && (
                <button
                  onClick={handleSendTask}
                  disabled={isSending}
                  className="text-primary hover:text-indigo-700 p-2 rounded-lg hover:bg-indigo-50 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="שלח משימה בוואטסאפ"
                >
                  {isSending ? '...' : <FaPaperPlane />}
                </button>
              )}
              <button
                onClick={() => onEdit(task)}
                className="text-blue-600 hover:text-blue-700 p-2 rounded-lg hover:bg-blue-50 transition-all duration-150"
                title="ערוך"
              >
                <FaEdit />
              </button>
              <button
                onClick={handleDelete}
                className="text-rose-600 hover:text-rose-700 p-2 rounded-lg hover:bg-rose-50 transition-all duration-150"
                title="מחק"
              >
                <FaTrash />
              </button>
            </div>
          </div>

          {task.description && (
            <p className="text-sm text-gray-600 leading-relaxed mb-3">
              {task.description}
            </p>
          )}

          <div className="flex flex-wrap gap-2 mb-3">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${priorityColors[task.priority]}`}>
              {priorityLabels[task.priority]}
            </span>
            {task.status !== 'sent' && task.status !== 'received' && (
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[task.status]}`}>
                {statusLabels[task.status]}
              </span>
            )}
            {task.system_name && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-violet-50 text-violet-700">
                {task.system_name}
              </span>
            )}
            {task.frequency && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 flex items-center gap-1">
                {task.is_recurring === 1 && <FaRedo className="text-xs" />}
                {frequencyLabels[task.frequency] || task.frequency}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <span className="text-base">📅</span>
                {format(new Date(task.start_date), 'dd/MM/yyyy')}
              </span>
              <span className="flex items-center gap-1">
                <span className="text-base">🕐</span>
                {task.start_time}
              </span>
            </div>

            {isChangingEmployee ? (
              <select
                value={task.employee_id || ''}
                onChange={handleEmployeeChange}
                onBlur={() => setIsChangingEmployee(false)}
                className="border border-gray-200 rounded-lg px-3 py-1 text-sm shadow-inner focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:border-primary transition-all duration-200"
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
                className="cursor-pointer hover:text-primary transition-colors duration-150 flex items-center gap-1"
              >
                <span className="text-base">👤</span>
                {task.employee_name || 'ללא עובד'}
              </span>
            )}
          </div>

          {/* Completion data section */}
          {(task.completion_note || (task.attachments && task.attachments.length > 0)) && (
            <div className="completion-section" style={{
              marginTop: '15px',
              paddingTop: '15px',
              borderTop: '1px solid #e5e7eb'
            }}>
              <h4 style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '10px'
              }}>
                פרטי השלמה:
              </h4>

              {/* Display note */}
              {task.completion_note && (
                <div className="completion-note" style={{
                  background: '#fef3c7',
                  padding: '10px',
                  borderRadius: '6px',
                  marginBottom: '10px',
                  fontSize: '14px',
                  lineHeight: '1.5'
                }}>
                  <strong>הערה:</strong> {task.completion_note}
                </div>
              )}

              {/* Display images */}
              {task.attachments && task.attachments.filter(a => a.file_type === 'image').length > 0 && (
                <div className="completion-images">
                  <div style={{
                    display: 'flex',
                    gap: '10px',
                    flexWrap: 'wrap'
                  }}>
                    {task.attachments
                      .filter(a => a.file_type === 'image')
                      .map((attachment) => (
                        <img
                          key={attachment.id}
                          src={`${API_URL}${attachment.file_path}`}
                          alt="תמונת השלמה"
                          className="thumbnail"
                          onClick={() => setLightboxImage(`${API_URL}${attachment.file_path}`)}
                          style={{
                            width: '80px',
                            height: '80px',
                            objectFit: 'cover',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            border: '2px solid #d1d5db',
                            transition: 'transform 0.2s'
                          }}
                          onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                          onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                        />
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox modal */}
      {lightboxImage && (
        <div
          className="lightbox-overlay"
          onClick={() => setLightboxImage(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            cursor: 'pointer'
          }}
        >
          <img
            src={lightboxImage}
            alt="תצוגה מלאה"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              objectFit: 'contain',
              cursor: 'default'
            }}
          />
        </div>
      )}
    </div>
  );
}
