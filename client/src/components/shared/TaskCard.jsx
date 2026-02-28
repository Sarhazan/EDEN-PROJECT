import { useState, useEffect } from 'react';
import { FaEdit, FaTrash, FaPaperPlane, FaRedo, FaCheck, FaMapMarkerAlt, FaBuilding, FaStar, FaRegStar, FaChevronDown, FaChevronUp, FaUserPlus } from 'react-icons/fa';
import { useApp } from '../../context/AppContext';
import { format, isToday } from 'date-fns';
import axios from 'axios';
import { API_URL, BACKEND_URL } from '../../config';

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

const priorityCircle = {
  urgent: { border: 'border-red-500', bg: 'bg-red-500' },
  normal: { border: 'border-blue-500', bg: 'bg-blue-500' },
  optional: { border: 'border-gray-400', bg: 'bg-gray-400' }
};

const statusLabels = {
  draft: 'חדש',
  sent: 'נשלח',
  received: 'התקבל',
  in_progress: 'בביצוע',
  pending_approval: 'ממתין לאישור',
  completed: 'הושלם',
  not_completed: 'לא בוצע'
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

export default function TaskCard({ task, onEdit, forceExpand = false }) {
  const { updateTaskStatus, toggleTaskStar, deleteTask, updateTask, employees, locations, systems } = useApp();
  const [isChangingEmployee, setIsChangingEmployee] = useState(false);
  const [isChangingLocation, setIsChangingLocation] = useState(false);
  const [isChangingTime, setIsChangingTime] = useState(false);
  const [isChangingSystem, setIsChangingSystem] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (forceExpand) {
      setIsExpanded(true);
    }
  }, [forceExpand]);

  const isTaskInFuture = () => {
    const now = new Date();

    if (task.is_recurring === 1) {
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(now);
      const recurringTime = task.start_time || '00:00';
      const taskStartDateTime = new Date(`${today}T${recurringTime}`);
      return taskStartDateTime > now;
    }

    // One-time task without time → always sendable (no time restriction)
    if (!task.start_time) {
      return true;
    }

    // One-time task with time → sendable only if start_date+start_time > now
    const taskDateTime = new Date(`${task.start_date}T${task.start_time}`);
    return taskDateTime > now;
  };

  const handleCheckbox = async (e) => {
    e.stopPropagation();
    const newStatus = task.status === 'completed' ? 'draft' : 'completed';
    try {
      await updateTaskStatus(task.id, newStatus);
    } catch (error) {
      alert('שגיאה: ' + error.message);
    }
  };

  const handleStarClick = async (e) => {
    e.stopPropagation();
    try {
      await toggleTaskStar(task.id);
    } catch (error) {
      alert('שגיאה: ' + error.message);
    }
  };

  const handleSendTask = async (e) => {
    e.stopPropagation();
    if (!task.employee_id) {
      alert('לא ניתן לשלוח משימה ללא עובד משוייך');
      return;
    }
    const employee = employees.find(emp => emp.id === task.employee_id);
    if (!employee || !employee.phone) {
      alert('לעובד אין מספר טלפון');
      return;
    }
    setIsSending(true);
    try {
      await axios.post(`${API_URL}/whatsapp/send-single-task`, {
        taskId: task.id,
        employeeId: task.employee_id
      }, { timeout: 60000 });
      await updateTaskStatus(task.id, 'sent');
      alert('המשימה נשלחה בהצלחה בוואטסאפ!');
    } catch (error) {
      alert('שגיאה: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (confirm('האם אתה בטוח שברצונך למחוק משימה זו?')) {
      try {
        await deleteTask(task.id);
      } catch (error) {
        alert('שגיאה: ' + error.message);
      }
    }
  };

  const handleEmployeeChange = async (e) => {
    e.stopPropagation();
    const newEmployeeId = e.target.value ? parseInt(e.target.value) : null;
    try {
      await updateTask(task.id, { ...task, employee_id: newEmployeeId });
      setIsChangingEmployee(false);
    } catch (error) {
      alert('שגיאה: ' + error.message);
    }
  };

  const handleLocationChange = async (e) => {
    e.stopPropagation();
    const newLocationId = e.target.value ? parseInt(e.target.value) : null;
    try {
      await updateTask(task.id, { ...task, location_id: newLocationId });
      setIsChangingLocation(false);
    } catch (error) {
      alert('שגיאה: ' + error.message);
    }
  };

  const handleTimeChange = async (e) => {
    e.stopPropagation();
    const newTime = e.target.value.trim();

    if (!newTime) {
      if (task.is_recurring === 1) {
        alert('למשימה קבועה חייבת להיות שעת התחלה');
        return;
      }

      try {
        await updateTask(task.id, { ...task, start_time: '' });
        setIsChangingTime(false);
      } catch (error) {
        alert('שגיאה: ' + error.message);
      }
      return;
    }

    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(newTime)) {
      alert('פורמט שעה לא תקין. השתמש בפורמט HH:MM (לדוגמא 08:30, 23:45)');
      return;
    }
    try {
      await updateTask(task.id, { ...task, start_time: newTime });
      setIsChangingTime(false);
    } catch (error) {
      alert('שגיאה: ' + error.message);
    }
  };

  const handleSystemChange = async (e) => {
    e.stopPropagation();
    const newSystemId = e.target.value ? parseInt(e.target.value) : null;
    try {
      await updateTask(task.id, { ...task, system_id: newSystemId });
      setIsChangingSystem(false);
    } catch (error) {
      alert('שגיאה: ' + error.message);
    }
  };

  const handleApproveTask = async (e) => {
    e.stopPropagation();
    try {
      await axios.post(`${API_URL}/tasks/${task.id}/approve`);
    } catch (error) {
      alert('שגיאה באישור המשימה: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleRowClick = (e) => {
    if (e.target.closest('button, input, select, a')) return;
    setIsExpanded(!isExpanded);
  };

  const pColors = priorityCircle[task.priority] || priorityCircle.normal;

  return (
    <div
      className={`
        task-compact-row group relative
        border-b border-gray-200
        transition-colors duration-150
        hover:bg-gray-50/70
        ${task.status === 'completed' ? 'opacity-50' : ''}
        ${task.status === 'pending_approval' ? 'task-pending-approval' : ''}
      `}
    >
      {/* Late indicator - thin red left border */}
      {task.is_late && (
        <div className="absolute right-0 top-0 bottom-0 w-[3px] bg-red-500 rounded-full" />
      )}

      {/* Near-deadline indicator - thin yellow left border */}
      {task.timing_status === 'near-deadline' && !task.is_late && (
        <div className="absolute right-0 top-0 bottom-0 w-[3px] bg-yellow-400 rounded-full" />
      )}

      {/* Main clickable area */}
      <div className="py-2.5 px-4 cursor-pointer flex items-start gap-3" onClick={handleRowClick}>
        {/* Star - standalone element, visually prominent */}
        <button
          onClick={handleStarClick}
          className={`mt-0.5 p-0.5 rounded transition-colors flex-shrink-0 ${
            task.is_starred === 1
              ? 'text-yellow-400 hover:text-yellow-500'
              : 'text-gray-300 hover:text-gray-400'
          }`}
        >
          {task.is_starred === 1 ? <FaStar size={28} /> : <FaRegStar size={28} />}
        </button>

        {/* Grid content */}
        <div className="flex-1 min-w-0">
        {/* Primary line */}
        <div className="grid items-center gap-x-2" style={{ gridTemplateColumns: 'auto 1fr 50px 60px auto auto' }}>
          {/* Col 1: Checkbox */}
          <input
            type="checkbox"
            checked={task.status === 'completed'}
            onChange={handleCheckbox}
            className={`
              w-5 h-5 rounded-full cursor-pointer appearance-none border-2
              transition-all duration-200
              ${task.status === 'completed'
                ? `${pColors.bg} ${pColors.border}`
                : `${pColors.border} hover:bg-gray-100`
              }
            `}
          />

          {/* Col 2: Title + optional time badge */}
          <div className="flex items-center gap-2 min-w-0">
            {task.start_time && (
              <span className="text-xs font-semibold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-md">
                {task.start_time.slice(0, 5)}
              </span>
            )}
            <span className={`
              task-title text-sm font-medium text-gray-900 truncate
              ${task.status === 'completed' ? 'line-through text-gray-500' : ''}
            `}>
              {task.title}
            </span>
          </div>

          {/* Col 3: Date */}
          <span className="text-xs text-gray-500 text-center">
            {!isToday(new Date(task.start_date)) && (
              <span className="bg-gray-100 px-2 py-0.5 rounded">
                {format(new Date(task.start_date), 'dd/MM')}
              </span>
            )}
          </span>

          {/* Col 4: Status */}
          <span className="text-center">
            {task.is_late && task.is_recurring === 1 && (
              <span className="text-[10px] text-red-600 font-semibold bg-red-50 px-1.5 py-0.5 rounded">באיחור</span>
            )}
            {task.status === 'sent' && task.sent_at && (
              <span className="text-emerald-500 text-xs" title={`נשלח ${new Date(task.sent_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`}>✓</span>
            )}
            {task.status === 'received' && (
              <span className="text-emerald-500 text-xs" title="התקבל">✓✓</span>
            )}
            {task.status === 'pending_approval' && (
              <span className="bg-orange-100 text-orange-600 text-[10px] px-1.5 py-0.5 rounded-full font-semibold">ממתין</span>
            )}
            {task.status === 'not_completed' && (
              <span className="bg-red-100 text-red-700 text-[10px] px-1.5 py-0.5 rounded-full font-semibold">לא בוצע</span>
            )}
          </span>

          {/* Col 5: Send button */}
          <span className="text-center">
            {task.status === 'draft' && task.employee_id && isTaskInFuture() ? (
              <button
                onClick={handleSendTask}
                disabled={isSending}
                className="text-primary hover:bg-indigo-50 p-1 rounded-lg transition-colors disabled:opacity-50"
                title="שלח בוואטסאפ"
              >
                {isSending ? <span className="text-xs">...</span> : <FaPaperPlane size={12} />}
              </button>
            ) : null}
          </span>

          {/* Col 6: Chevron */}
          <span className="text-gray-400 text-xs text-center">
            {isExpanded ? <FaChevronUp size={10} /> : <FaChevronDown size={10} />}
          </span>
        </div>

        {/* Secondary metadata line (collapsed view only) */}
        {!isExpanded && (
          <div className="flex items-center gap-3 mt-1 mr-8 text-xs text-gray-400">
            {/* Employee — first item, directly below title */}
            {isChangingEmployee ? (
              <select
                value={task.employee_id || ''}
                onChange={handleEmployeeChange}
                onBlur={() => setIsChangingEmployee(false)}
                className="border border-gray-200 rounded px-1 py-0.5 text-xs"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              >
                <option value="">ללא עובד</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            ) : (
              <span
                onClick={(e) => { e.stopPropagation(); setIsChangingEmployee(true); }}
                className={`cursor-pointer hover:text-primary transition-colors font-medium ${task.employee_name ? 'text-gray-500' : 'text-gray-300'}`}
                title={task.employee_name ? 'שנה עובד' : 'שבץ עובד'}
              >
                {task.employee_name || '+ עובד'}
              </span>
            )}

            {/* Time - clickable to edit */}
            {isChangingTime ? (
              <input
                type="text"
                defaultValue={task.start_time?.slice(0, 5) || ''}
                placeholder="HH:MM"
                maxLength={5}
                onFocus={(e) => e.target.select()}
                onBlur={(e) => { handleTimeChange(e); }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleTimeChange(e); if (e.key === 'Escape') setIsChangingTime(false); }}
                className="border border-gray-300 rounded px-1.5 py-0.5 text-xs w-14 text-center"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span
                onClick={(e) => { e.stopPropagation(); setIsChangingTime(true); }}
                className="cursor-pointer hover:text-indigo-500 transition-colors"
                title="שנה שעה"
              >
                {task.start_time ? task.start_time.slice(0, 5) : 'ללא שעה'}
              </span>
            )}

            {/* Location */}
            {task.location_name && (
              <span className="flex items-center gap-0.5">
                <FaMapMarkerAlt size={9} />
                {task.location_name}
              </span>
            )}

            {/* Building */}
            {task.building_name && (
              <span className="flex items-center gap-0.5 text-amber-600">
                <FaBuilding size={9} />
                {task.building_name}
              </span>
            )}

            {/* Frequency for recurring */}
            {task.is_recurring === 1 && task.frequency && (
              <span className="flex items-center gap-0.5">
                <FaRedo size={8} />
                {frequencyLabels[task.frequency] || task.frequency}
              </span>
            )}

            {/* System - clickable to edit */}
            {isChangingSystem ? (
              <select
                value={task.system_id || ''}
                onChange={handleSystemChange}
                onBlur={() => setIsChangingSystem(false)}
                className="border border-gray-200 rounded px-2 py-0.5 text-xs"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              >
                <option value="">ללא מערכת</option>
                {systems && systems.map((sys) => (
                  <option key={sys.id} value={sys.id}>{sys.name}</option>
                ))}
              </select>
            ) : (
              <span
                onClick={(e) => { e.stopPropagation(); setIsChangingSystem(true); }}
                className={`cursor-pointer hover:text-violet-700 transition-colors ${task.system_name ? 'text-violet-500' : 'text-gray-300'}`}
                title={task.system_name ? 'שנה מערכת' : 'בחר מערכת'}
              >
                {task.system_name || '+ מערכת'}
              </span>
            )}

            {/* Timing hint for recurring */}
            {task.is_recurring === 1 && task.timing_status === 'near-deadline' && !task.is_late && (
              <span className="text-yellow-600 font-medium">
                נשארו {task.minutes_remaining_text || `${task.minutes_remaining} דק'`}
              </span>
            )}
          </div>
        )}

        {/* ─── Expanded details ─── */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-gray-100 mr-8">
            {/* Description */}
            {task.description && (
              <p className="task-description text-sm text-gray-600 leading-relaxed mb-3">
                {task.description}
              </p>
            )}

            {/* Badges row */}
            <div className="flex flex-wrap gap-2 mb-3">
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${priorityColors[task.priority]}`}>
                {priorityLabels[task.priority]}
              </span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${task.status === 'not_completed' ? 'bg-red-100 text-red-700' : 'bg-slate-50 text-slate-700'}`}>
                {statusLabels[task.status]}
              </span>
              {task.system_name && (
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-50 text-violet-700">
                  {task.system_name}
                </span>
              )}
              {task.building_name && (
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 flex items-center gap-1">
                  <FaBuilding className="text-[10px]" />
                  {task.building_name}
                </span>
              )}
              {task.frequency && (
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 flex items-center gap-1">
                  {task.is_recurring === 1 && <FaRedo className="text-[10px]" />}
                  {frequencyLabels[task.frequency] || task.frequency}
                </span>
              )}
            </div>

            {/* Metadata row */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-3">
              <span className="flex items-center gap-1">
                📅 {format(new Date(task.start_date), 'dd/MM/yyyy')}
              </span>
              <span className="flex items-center gap-1">
                🕐 {task.start_time ? task.start_time.slice(0, 5) : 'ללא שעה'}
              </span>

              {/* Location with change */}
              {isChangingLocation ? (
                <select
                  value={task.location_id || ''}
                  onChange={handleLocationChange}
                  onBlur={() => setIsChangingLocation(false)}
                  className="border border-gray-200 rounded px-2 py-1 text-xs"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                >
                  <option value="">ללא מיקום</option>
                  {locations && locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              ) : (
                <span
                  onClick={(e) => { e.stopPropagation(); setIsChangingLocation(true); }}
                  className="cursor-pointer hover:text-primary transition-colors flex items-center gap-1"
                >
                  <FaMapMarkerAlt className={task.location_id ? 'text-teal-600' : ''} size={12} />
                  {task.location_name || 'ללא מיקום'}
                </span>
              )}

              {/* Employee with change */}
              {isChangingEmployee ? (
                <select
                  value={task.employee_id || ''}
                  onChange={handleEmployeeChange}
                  onBlur={() => setIsChangingEmployee(false)}
                  className="border border-gray-200 rounded px-2 py-1 text-xs"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                >
                  <option value="">ללא עובד</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              ) : (
                <span
                  onClick={(e) => { e.stopPropagation(); setIsChangingEmployee(true); }}
                  className="cursor-pointer hover:text-primary transition-colors flex items-center gap-1"
                >
                  👤 {task.employee_name || 'ללא עובד'}
                </span>
              )}
            </div>

            {/* Sent/Received details */}
            {(task.status === 'sent' || task.status === 'received') && task.sent_at && (
              <div className="flex flex-wrap gap-3 mb-3">
                <div className="flex items-center gap-1 text-sm text-emerald-600">
                  <FaCheck size={12} />
                  <span className="font-semibold">נשלח</span>
                  <span className="text-gray-500">
                    {new Date(task.sent_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {task.status === 'received' && task.acknowledged_at && (
                  <div className="flex items-center gap-1 text-sm text-amber-600">
                    <FaCheck size={12} />
                    <span className="font-semibold">התקבל</span>
                    <span className="text-gray-500">
                      {new Date(task.acknowledged_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Timing information - recurring tasks */}
            {task.is_recurring === 1 && task.status !== 'completed' && (task.is_late !== undefined || task.minutes_remaining !== undefined) && (
              <div className="mb-3 p-2 rounded bg-gray-50">
                {task.is_late ? (
                  <div className="flex items-center gap-2">
                    <span>⏰</span>
                    <div>
                      <div className="text-sm font-semibold text-red-600">
                        באיחור {task.minutes_remaining_text || `${Math.abs(task.minutes_remaining)} דקות`}
                      </div>
                      <div className="text-xs text-gray-500">
                        היה צריך להסתיים ב-{task.estimated_end_time}
                      </div>
                    </div>
                  </div>
                ) : task.timing_status === 'near-deadline' ? (
                  <div className="flex items-center gap-2">
                    <span>⚠️</span>
                    <div>
                      <div className="text-sm font-semibold text-yellow-600">
                        נשארו {task.minutes_remaining_text || `${task.minutes_remaining} דקות`}
                      </div>
                      <div className="text-xs text-gray-500">סיום מוערך: {task.estimated_end_time}</div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span>✅</span>
                    <div>
                      <div className="text-sm text-gray-600">
                        נשארו {task.minutes_remaining_text || `${task.minutes_remaining} דקות`}
                      </div>
                      <div className="text-xs text-gray-500">סיום מוערך: {task.estimated_end_time}</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Completion variance */}
            {task.status === 'completed' && task.time_delta_text && (
              <div className="mb-3 p-2 rounded bg-gray-50">
                <div className="flex items-center gap-2">
                  <span>
                    {task.time_delta_minutes < 0 ? '🎉' : task.time_delta_minutes > 0 ? '⏱️' : '✅'}
                  </span>
                  <div className={`text-sm font-semibold ${
                    task.time_delta_minutes < 0 ? 'text-green-600' :
                    task.time_delta_minutes > 0 ? 'text-orange-600' :
                    'text-gray-600'
                  }`}>
                    {task.time_delta_text}
                  </div>
                </div>
              </div>
            )}

            {/* Completion data */}
            {(task.completion_note || (task.attachments && task.attachments.length > 0)) && (
              <div className="mb-3 p-3 rounded bg-amber-50 border border-amber-100">
                <h4 className="text-xs font-semibold text-gray-700 mb-2">פרטי השלמה:</h4>
                {task.completion_note && (
                  <div className="text-sm leading-relaxed mb-2">
                    {task.original_language && task.original_language !== 'he' && (
                      <div className="mb-1 text-xs text-gray-500 flex items-center gap-1">
                        {task.original_language === 'en' && '🇬🇧'}
                        {task.original_language === 'ru' && '🇷🇺'}
                        {task.original_language === 'ar' && '🇸🇦'}
                        <span>
                          מתורגם מ{task.original_language === 'en' ? 'אנגלית' : task.original_language === 'ru' ? 'רוסית' : 'ערבית'}
                        </span>
                      </div>
                    )}
                    <strong>הערה:</strong> {task.completion_note}
                  </div>
                )}
                {task.attachments && task.attachments.filter(a => a.file_type === 'image').length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {task.attachments
                      .filter(a => a.file_type === 'image')
                      .map((attachment) => (
                        <img
                          key={attachment.id}
                          src={`${BACKEND_URL}${attachment.file_path}`}
                          alt="תמונת השלמה"
                          className="thumbnail"
                          onClick={(e) => { e.stopPropagation(); setLightboxImage(`${BACKEND_URL}${attachment.file_path}`); }}
                          style={{
                            width: '64px',
                            height: '64px',
                            objectFit: 'cover',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            border: '2px solid #d1d5db'
                          }}
                        />
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* Expanded action buttons */}
            <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
              {task.status === 'pending_approval' && (
                <button
                  onClick={handleApproveTask}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                >
                  <FaCheck size={11} /> בוצע
                </button>
              )}
              {task.status === 'draft' && task.employee_id && isTaskInFuture() && (
                <button
                  onClick={handleSendTask}
                  disabled={isSending}
                  className="text-primary hover:bg-indigo-50 p-1.5 rounded-lg transition-colors disabled:opacity-50"
                  title="שלח בוואטסאפ"
                >
                  {isSending ? '...' : <FaPaperPlane size={13} />}
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(task); }}
                className="text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg transition-colors"
                title="ערוך"
              >
                <FaEdit size={13} />
              </button>
              <button
                onClick={handleDelete}
                className="text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-colors"
                title="מחק"
              >
                <FaTrash size={13} />
              </button>
            </div>
          </div>
        )}
        </div>{/* end flex-1 grid wrapper */}
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
