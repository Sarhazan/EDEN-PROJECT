import { useEffect, useMemo, useRef, useState } from 'react';
import { addDays, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, parseISO, startOfMonth, startOfWeek } from 'date-fns';
import { he } from 'date-fns/locale';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import axios from 'axios';
import Modal from '../shared/Modal';
import TaskForm from '../forms/TaskForm';
import QuickTaskModal from '../forms/QuickTaskModal';
import { useApp } from '../../context/AppContext';
import { toast } from 'react-toastify';

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 06:00 - 21:00
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';

const STATUS_COLORS = {
  draft: 'bg-slate-500',
  sent: 'bg-blue-500',
  received: 'bg-cyan-500',
  in_progress: 'bg-amber-500',
  pending_approval: 'bg-orange-500',
  completed: 'bg-emerald-500',
  not_completed: 'bg-red-500'
};

function toDisplayDate(date) {
  return format(date, 'dd/MM/yyyy');
}

function toIsoDate(date) {
  return format(date, 'yyyy-MM-dd');
}

function titleWithTime(task) {
  if (!task.start_time) return task.title || 'ללא כותרת';
  return `${task.start_time} ${task.title || 'ללא כותרת'}`;
}

export default function EmployeeCalendarModal({ employee, isOpen, onClose }) {
  const { tasks, updateTask, refreshData } = useApp();
  const [view, setView] = useState('week');
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [dragTaskId, setDragTaskId] = useState(null);
  const [resizeState, setResizeState] = useState(null);
  const resizeStateRef = useRef(null);
  const [quickCreateDefaults, setQuickCreateDefaults] = useState(null);
  const [editingTask, setEditingTask] = useState(null);

  const employeeTasks = useMemo(() => {
    return tasks
      .filter((t) => Number(t.employee_id) === Number(employee?.id))
      .sort((a, b) => {
        const da = new Date(`${a.start_date}T${a.start_time || '00:00'}`);
        const db = new Date(`${b.start_date}T${b.start_time || '00:00'}`);
        return da - db;
      });
  }, [tasks, employee?.id]);

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(anchorDate), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(anchorDate), { weekStartsOn: 0 });
    const days = [];
    let curr = start;
    while (curr <= end) {
      days.push(curr);
      curr = addDays(curr, 1);
    }
    return days;
  }, [anchorDate]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(anchorDate, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [anchorDate]);

  const tasksForDate = (date) => employeeTasks.filter((t) => isSameDay(parseISO(t.start_date), date));

  const durationForTask = (task) => Number(task?.estimated_duration_minutes) > 0 ? Number(task.estimated_duration_minutes) : 60;

  const taskHeightPx = (durationMinutes) => Math.max(11, (durationMinutes / 60) * 42);

  const timeToMinutes = (timeStr) => {
    const [h, m] = (timeStr || '00:00').split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const hasDayOverlap = (taskId, startDate, startTime, durationMinutes) => {
    const currentStart = timeToMinutes(startTime);
    const currentEnd = currentStart + durationMinutes;
    const sameDayTasks = employeeTasks.filter(
      (t) => Number(t.id) !== Number(taskId) && t.start_date === startDate
    );

    return sameDayTasks.some((t) => {
      const otherStart = timeToMinutes(t.start_time || '00:00');
      const otherEnd = otherStart + durationForTask(t);
      return currentStart < otherEnd && otherStart < currentEnd;
    });
  };

  useEffect(() => {
    resizeStateRef.current = resizeState;
  }, [resizeState]);

  useEffect(() => {
    if (!resizeState?.resizingTaskId) return undefined;

    const onMouseMove = (e) => {
      const currentState = resizeStateRef.current;
      if (!currentState) return;

      const deltaY = e.clientY - currentState.resizeY;
      const snappedSteps = Math.round(deltaY / 10.5); // 15-minute steps
      const nextDuration = Math.max(15, currentState.resizeInitialDuration + (snappedSteps * 15));

      setResizeState((prev) => {
        if (!prev) return prev;
        if (prev.resizeCurrentDuration === nextDuration) return prev;
        return { ...prev, resizeCurrentDuration: nextDuration };
      });
    };

    const onMouseUp = async () => {
      const finalState = resizeStateRef.current;
      if (!finalState) return;

      if (finalState.resizeCurrentDuration !== finalState.resizeInitialDuration) {
        if (hasDayOverlap(finalState.resizingTaskId, finalState.startDate, finalState.startTime, finalState.resizeCurrentDuration)) {
          toast.error('לא ניתן לשנות משך זמן בגלל חפיפה עם משימה אחרת', {
            position: 'bottom-center',
            autoClose: 2000,
            hideProgressBar: true,
            rtl: true
          });
          setResizeState(null);
          return;
        }

        try {
          await axios.patch(`${API_URL}/tasks/${finalState.resizingTaskId}`, {
            estimated_duration_minutes: finalState.resizeCurrentDuration
          });
          await refreshData();
        } catch (error) {
          toast.error('שמירת משך הזמן נכשלה', {
            position: 'bottom-center',
            autoClose: 2000,
            hideProgressBar: true,
            rtl: true
          });
        }
      }

      setResizeState(null);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [resizeState?.resizingTaskId, refreshData]);

  const handleDrop = async (date, hour = null) => {
    if (!dragTaskId) return;
    const task = employeeTasks.find((t) => Number(t.id) === Number(dragTaskId));
    if (!task) return;

    const payload = {
      ...task,
      start_date: toIsoDate(date),
      employee_id: employee.id
    };

    if (hour !== null) {
      payload.start_time = `${String(hour).padStart(2, '0')}:00`;
    }

    await updateTask(task.id, payload);
    setDragTaskId(null);
  };

  const openCreateForm = (date, hour = 9) => {
    // Block creating tasks in the past
    const clickedDay = new Date(date);
    clickedDay.setHours(0, 0, 0, 0);
    const todayStart = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' }));
    todayStart.setHours(0, 0, 0, 0);

    if (clickedDay < todayStart) {
      toast.error('לא ניתן ליצור משימה בתאריך שעבר', {
        position: 'bottom-center',
        autoClose: 2000,
        hideProgressBar: true,
        rtl: true
      });
      return;
    }

    // Block creating tasks in a past hour today
    if (clickedDay.getTime() === todayStart.getTime()) {
      const nowInIsrael = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' }));
      if (hour < nowInIsrael.getHours()) {
        toast.error('לא ניתן ליצור משימה בשעה שכבר עברה', {
          position: 'bottom-center',
          autoClose: 2000,
          hideProgressBar: true,
          rtl: true
        });
        return;
      }
    }

    setEditingTask(null);
    setQuickCreateDefaults({
      title: '',
      employee_id: String(employee.id),
      start_date: toIsoDate(date),
      start_time: `${String(hour).padStart(2, '0')}:00`,
      frequency: 'weekly'
    });
  };

  const navLabel = view === 'month'
    ? format(anchorDate, 'MMMM yyyy', { locale: he })
    : view === 'week'
      ? `${format(weekDays[0], 'dd/MM')} - ${format(weekDays[6], 'dd/MM')}`
      : format(anchorDate, 'EEEE dd/MM', { locale: he });

  const shift = (dir) => {
    if (view === 'month') setAnchorDate(addDays(anchorDate, dir * 30));
    else if (view === 'week') setAnchorDate(addDays(anchorDate, dir * 7));
    else setAnchorDate(addDays(anchorDate, dir));
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={`יומן - ${employee?.name || ''}`}>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button className={`px-3 py-1 rounded ${view === 'day' ? 'bg-primary text-white' : 'bg-gray-100'}`} onClick={() => setView('day')}>יום</button>
              <button className={`px-3 py-1 rounded ${view === 'week' ? 'bg-primary text-white' : 'bg-gray-100'}`} onClick={() => setView('week')}>שבוע</button>
              <button className={`px-3 py-1 rounded ${view === 'month' ? 'bg-primary text-white' : 'bg-gray-100'}`} onClick={() => setView('month')}>חודש</button>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => shift(-1)} className="p-2 bg-gray-100 rounded"><FaChevronRight /></button>
              <div className="font-semibold">{navLabel}</div>
              <button onClick={() => shift(1)} className="p-2 bg-gray-100 rounded"><FaChevronLeft /></button>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            {Object.entries(STATUS_COLORS).map(([k, cls]) => (
              <div key={k} className="flex items-center gap-1">
                <span className={`inline-block w-2 h-2 rounded-full ${cls}`}></span>
                <span>{k}</span>
              </div>
            ))}
          </div>

          {view === 'month' && (
            <div className="grid grid-cols-7 border rounded overflow-hidden text-xs">
              {['א','ב','ג','ד','ה','ו','ש'].map((d) => (
                <div key={d} className="p-2 font-bold bg-gray-50 border-b text-center">{d}</div>
              ))}
              {monthDays.map((date) => {
                const dayTasks = tasksForDate(date);
                return (
                  <div
                    key={date.toISOString()}
                    className={`min-h-[110px] p-1 border ${isSameMonth(date, anchorDate) ? 'bg-white' : 'bg-gray-50'}`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(date)}
                    onClick={() => openCreateForm(date)}
                  >
                    <div className="text-[11px] mb-1">{format(date, 'dd')}</div>
                    <div className="space-y-1">
                      {dayTasks.slice(0, 3).map((task) => (
                        <button
                          key={task.id}
                          draggable
                          onDragStart={(e) => { e.stopPropagation(); setDragTaskId(task.id); }}
                          onClick={(e) => { e.stopPropagation(); setEditingTask(task); }}
                          className={`w-full text-right text-[10px] text-white px-1 py-0.5 rounded truncate ${STATUS_COLORS[task.status] || 'bg-slate-500'}`}
                          title={titleWithTime(task)}
                        >
                          {titleWithTime(task)}
                        </button>
                      ))}
                      {dayTasks.length > 3 && <div className="text-[10px] text-blue-600">+{dayTasks.length - 3} עוד</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {(view === 'week' || view === 'day') && (
            <div className="border rounded">
              <div className="w-full">
                <div className={`grid ${view === 'day' ? 'grid-cols-[80px_1fr]' : 'grid-cols-[80px_repeat(7,minmax(0,1fr))]'} bg-gray-50 border-b`}>
                  <div className="p-2 text-xs"></div>
                  {(view === 'day' ? [anchorDate] : weekDays).map((d) => (
                    <div key={d.toISOString()} className="p-2 text-xs font-semibold text-center border-r">
                      {format(d, 'EEE dd/MM', { locale: he })}
                    </div>
                  ))}
                </div>

                {HOURS.map((hour) => (
                  <div key={hour} className={`grid ${view === 'day' ? 'grid-cols-[80px_1fr]' : 'grid-cols-[80px_repeat(7,minmax(0,1fr))]'} border-b`}>
                    <div className="text-xs p-2 bg-gray-50 border-r">{String(hour).padStart(2, '0')}:00</div>
                    {(view === 'day' ? [anchorDate] : weekDays).map((day) => {
                      const cellTasks = tasksForDate(day).filter((t) => Number((t.start_time || '00:00').split(':')[0]) === hour);
                      return (
                        <div
                          key={`${day.toISOString()}-${hour}`}
                          className="h-[42px] border-r relative"
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => handleDrop(day, hour)}
                          onClick={() => openCreateForm(day, hour)}
                        >
                          <div className="absolute inset-0">
                            {cellTasks.map((task) => (
                              <button
                                key={task.id}
                                draggable
                                onDragStart={(e) => { e.stopPropagation(); setDragTaskId(task.id); }}
                                onClick={(e) => { e.stopPropagation(); setEditingTask(task); }}
                                className={`absolute top-0 left-0 w-full text-right text-[10px] text-white px-1 py-0.5 rounded truncate ${STATUS_COLORS[task.status] || 'bg-slate-500'}`}
                                title={titleWithTime(task)}
                                style={{
                                  height: `${taskHeightPx(
                                    resizeState?.resizingTaskId === task.id
                                      ? resizeState.resizeCurrentDuration
                                      : durationForTask(task)
                                  )}px`,
                                  minHeight: '11px'
                                }}
                              >
                                <div className="pr-1">{titleWithTime(task)}</div>
                                {resizeState?.resizingTaskId === task.id && (
                                  <div className="absolute top-0 left-0 m-1 px-1 py-0.5 rounded bg-black/70 text-white text-[9px] leading-none">
                                    {resizeState.resizeCurrentDuration} דקות
                                  </div>
                                )}
                                <div
                                  className="absolute bottom-0 left-0 w-full h-2 cursor-ns-resize bg-black/20"
                                  onMouseDown={(e) => {
                                    e.stopPropagation();
                                    const resizeInitialDuration = durationForTask(task);
                                    setResizeState({
                                      resizingTaskId: task.id,
                                      resizeY: e.clientY,
                                      resizeInitialDuration,
                                      resizeCurrentDuration: resizeInitialDuration,
                                      startDate: task.start_date,
                                      startTime: task.start_time || '00:00'
                                    });
                                  }}
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>

      <Modal isOpen={!!editingTask} onClose={() => setEditingTask(null)} title="ערוך משימה">
        {editingTask && <TaskForm task={editingTask} onClose={() => setEditingTask(null)} />}
      </Modal>

      {quickCreateDefaults && (
        <QuickTaskModal
          isOpen={!!quickCreateDefaults}
          initialValues={quickCreateDefaults}
          onClose={() => {
            setQuickCreateDefaults(null);
            refreshData();
          }}
        />
      )}
    </>
  );
}
