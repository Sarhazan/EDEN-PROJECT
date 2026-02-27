import { useMemo, useState } from 'react';
import { addDays, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, parseISO, startOfMonth, startOfWeek } from 'date-fns';
import { he } from 'date-fns/locale';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import Modal from '../shared/Modal';
import TaskForm from '../forms/TaskForm';
import { useApp } from '../../context/AppContext';

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 06:00 - 21:00

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
  const { tasks, updateTask } = useApp();
  const [view, setView] = useState('week');
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [dragTaskId, setDragTaskId] = useState(null);
  const [createDefaults, setCreateDefaults] = useState(null);
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
    setEditingTask(null);
    setCreateDefaults({
      title: '',
      employee_id: String(employee.id),
      start_date: toDisplayDate(date),
      start_time: `${String(hour).padStart(2, '0')}:00`,
      frequency: 'one-time',
      status: 'draft'
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
                    onDoubleClick={() => openCreateForm(date)}
                  >
                    <div className="text-[11px] mb-1">{format(date, 'dd')}</div>
                    <div className="space-y-1">
                      {dayTasks.slice(0, 3).map((task) => (
                        <button
                          key={task.id}
                          draggable
                          onDragStart={() => setDragTaskId(task.id)}
                          onClick={() => setEditingTask(task)}
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
                    <div key={d.toISOString()} className="p-2 text-xs font-semibold text-center border-r last:border-r-0">
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
                          className="min-h-[42px] p-1 border-r last:border-r-0"
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => handleDrop(day, hour)}
                          onDoubleClick={() => openCreateForm(day, hour)}
                        >
                          <div className="space-y-1">
                            {cellTasks.map((task) => (
                              <button
                                key={task.id}
                                draggable
                                onDragStart={() => setDragTaskId(task.id)}
                                onClick={() => setEditingTask(task)}
                                className={`w-full text-right text-[10px] text-white px-1 py-0.5 rounded truncate ${STATUS_COLORS[task.status] || 'bg-slate-500'}`}
                                title={titleWithTime(task)}
                              >
                                {titleWithTime(task)}
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

      <Modal isOpen={!!createDefaults} onClose={() => setCreateDefaults(null)} title="משימה חדשה">
        {createDefaults && <TaskForm initialValues={createDefaults} onClose={() => setCreateDefaults(null)} />}
      </Modal>
    </>
  );
}
