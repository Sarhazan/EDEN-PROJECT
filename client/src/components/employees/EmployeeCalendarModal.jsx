import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  addDays, endOfMonth, endOfWeek, format,
  isSameDay, isSameMonth, parseISO, startOfMonth, startOfWeek
} from 'date-fns';
import { he } from 'date-fns/locale';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import axios from 'axios';
import Modal from '../shared/Modal';
import TaskForm from '../forms/TaskForm';
import QuickTaskModal from '../forms/QuickTaskModal';
import { useApp } from '../../context/AppContext';
import { toast } from 'react-toastify';
import { API_URL } from '../../config';

const DEFAULT_HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 06:00–21:00
const TIME_COL_WIDTH = 80; // px for left time label column

// ── Status colour maps ────────────────────────────────────────────────────────
const STATUS_COLORS = {
  draft: 'bg-slate-500',
  sent: 'bg-blue-500',
  received: 'bg-cyan-500',
  in_progress: 'bg-amber-500',
  pending_approval: 'bg-orange-500',
  completed: 'bg-emerald-500',
  not_completed: 'bg-red-500',
};

const STATUS_BG = {
  draft: '#cbd5e1',
  sent: '#bfdbfe',
  received: '#a5f3fc',
  in_progress: '#fde68a',
  pending_approval: '#fed7aa',
  completed: '#a7f3d0',
  not_completed: '#fecaca',
};

const STATUS_BORDER = {
  draft: '#475569',
  sent: '#2563eb',
  received: '#0891b2',
  in_progress: '#d97706',
  pending_approval: '#ea580c',
  completed: '#059669',
  not_completed: '#dc2626',
};

const STATUS_TEXT = {
  draft: '#1e293b',
  sent: '#1e3a8a',
  received: '#164e63',
  in_progress: '#78350f',
  pending_approval: '#7c2d12',
  completed: '#064e3b',
  not_completed: '#7f1d1d',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function toIsoDate(date) {
  return format(date, 'yyyy-MM-dd');
}

function titleWithTime(task) {
  if (!task.start_time) return task.title || 'ללא כותרת';
  return `${task.start_time} ${task.title || 'ללא כותרת'}`;
}

function timeToMinutes(timeStr) {
  const [h, m] = (timeStr || '00:00').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function formatMinutes(minutes) {
  if (minutes < 60) return `${minutes} דקות`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h} שעה${h > 1 ? 'ות' : ''}`;
  return `${h}:${String(m).padStart(2, '0')} שעה`;
}

function formatTimeRange(startTime, durationMinutes) {
  const [h, m] = (startTime || '00:00').split(':').map(Number);
  const totalMin = (h || 0) * 60 + (m || 0) + durationMinutes;
  const eH = Math.floor(totalMin / 60) % 24;
  const eM = totalMin % 60;
  return `${String(h || 0).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}–${String(eH).padStart(2, '0')}:${String(eM).padStart(2, '0')}`;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function EmployeeCalendarModal({ employee, isOpen, onClose }) {
  const { tasks, refreshData } = useApp();

  const [view, setView] = useState('week');
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [dragging, setDragging] = useState(null);   // drag-to-move state
  const [resizeState, setResizeState] = useState(null); // drag-to-resize state
  const [quickCreateDefaults, setQuickCreateDefaults] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [hours, setHours] = useState(DEFAULT_HOURS);
  const [measuredHourHeight, setMeasuredHourHeight] = useState(64);
  const [tooltip, setTooltip] = useState(null); // { task, x, y }

  // Refs for stale-closure-safe access inside document event handlers
  const draggingRef = useRef(null);
  const resizeStateRef = useRef(null);
  const hourRowRef = useRef(null);
  const gridBodyRef = useRef(null);
  const hoursBodyRef = useRef(null);
  const viewRef = useRef(view);
  const anchorDateRef = useRef(anchorDate);
  const weekDaysRef = useRef(null);
  const employeeTasksRef = useRef([]);
  const didResizeRef = useRef(false);
  const suppressNextClickRef = useRef(false);
  
  const ghostRef = useRef(null);
  const measuredHourHeightRef = useRef(measuredHourHeight);

  useEffect(() => {
    measuredHourHeightRef.current = measuredHourHeight;
  }, [measuredHourHeight]);

  useEffect(() => {
    const fetchWorkdayHours = async () => {
      try {
        const [startRes, endRes] = await Promise.all([
          axios.get(`${API_URL}/accounts/settings/workday_start_time`),
          axios.get(`${API_URL}/accounts/settings/workday_end_time`)
        ]);

        const startTime = startRes?.data?.value || '08:00';
        const endTime = endRes?.data?.value || '18:00';

        const parsedStart = parseInt(String(startTime).split(':')[0], 10);
        const parsedEnd = parseInt(String(endTime).split(':')[0], 10);

        const startHour = Math.max(0, (Number.isFinite(parsedStart) ? parsedStart : 8) - 2);
        const endHour = Math.min(23, (Number.isFinite(parsedEnd) ? parsedEnd : 18) + 2);
        const normalizedEnd = endHour >= startHour ? endHour : startHour;

        setHours(Array.from({ length: normalizedEnd - startHour + 1 }, (_, i) => startHour + i));
      } catch (error) {
        console.error('Failed to load workday settings for calendar hours:', error);
      }
    };

    fetchWorkdayHours();
  }, []);

  useEffect(() => {
    if (!hourRowRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      const h = entry.contentRect.height;
      if (h > 0) setMeasuredHourHeight(h);
    });
    ro.observe(hourRowRef.current);
    return () => ro.disconnect();
  }, []);

  // ── Derived data ────────────────────────────────────────────────────────────
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
    const start = startOfWeek(startOfMonth(anchorDate), { weekStartsOn: 0 }); // Sunday
    const end = endOfWeek(endOfMonth(anchorDate), { weekStartsOn: 0 });
    const days = [];
    let curr = start;
    while (curr <= end) { days.push(curr); curr = addDays(curr, 1); }
    return days;
  }, [anchorDate]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(anchorDate, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i)); // Sun–Sat full week
  }, [anchorDate]);

  // Keep refs up-to-date every render
  useEffect(() => { draggingRef.current = dragging; }, [dragging]);
  useEffect(() => { resizeStateRef.current = resizeState; }, [resizeState]);
  useEffect(() => { viewRef.current = view; }, [view]);
  useEffect(() => { anchorDateRef.current = anchorDate; }, [anchorDate]);
  useEffect(() => { weekDaysRef.current = weekDays; }, [weekDays]);
  useEffect(() => { employeeTasksRef.current = employeeTasks; }, [employeeTasks]);

  // ── Utility fns ─────────────────────────────────────────────────────────────
  const durationForTask = (task) =>
    Number(task?.estimated_duration_minutes) > 0
      ? Number(task.estimated_duration_minutes)
      : 60;

  const taskHeightPx = (dur) => Math.max(36, (dur / 60) * measuredHourHeight);

  const tasksForDate = (date) =>
    employeeTasks.filter((t) => isSameDay(parseISO(t.start_date), date));

  /** Overlap check — reads from ref so it's always fresh inside effects */
  const hasDayOverlapRef = (taskId, startDate, startTime, durationMinutes) => {
    const all = employeeTasksRef.current;
    const cStart = timeToMinutes(startTime);
    const cEnd = cStart + durationMinutes;
    return all
      .filter((t) => Number(t.id) !== Number(taskId) && t.start_date === startDate)
      .some((t) => {
        const oStart = timeToMinutes(t.start_time || '00:00');
        const oEnd = oStart + (Number(t.estimated_duration_minutes) > 0 ? Number(t.estimated_duration_minutes) : 60);
        return cStart < oEnd && oStart < cEnd;
      });
  };

  // ── Cursor style during drag ─────────────────────────────────────────────────
  useEffect(() => {
    if (dragging?.hasMoved) {
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [dragging?.hasMoved]);

  // ── FEATURE 1: Drag-to-Move ──────────────────────────────────────────────────
  const handleTaskMouseDown = useCallback((e, task) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    const [hStr, mStr] = (task.start_time || '06:00').split(':');
    const taskRect = e.currentTarget.getBoundingClientRect();
    const clickOffsetY = e.clientY - taskRect.top;
    const clickOffsetX = e.clientX - taskRect.left;
    const taskWidth = taskRect.width;
    const newDragState = {
      taskId: task.id,
      task,
      startClientX: e.clientX,
      startClientY: e.clientY,
      clickOffsetY,
      clickOffsetX,
      taskWidth,
      hasMoved: false,
      currentHour: Number(hStr) || 6,
      currentMinute: Math.round((Number(mStr) || 0) / 15) * 15,
      currentDay: parseISO(task.start_date),
    };
    draggingRef.current = newDragState;
    setDragging(newDragState);
  }, []);

  useEffect(() => {
    if (!dragging) return;

    const onMouseMove = (e) => {
      const state = draggingRef.current;
      if (!state) return;

      const dx = Math.abs(e.clientX - state.startClientX);
      const dy = Math.abs(e.clientY - state.startClientY);
      if (dx < 3 && dy < 3 && !state.hasMoved) return; // dead zone

      if (!gridBodyRef.current || !hoursBodyRef.current) return;
      const rect = gridBodyRef.current.getBoundingClientRect();
      const hoursRect = hoursBodyRef.current.getBoundingClientRect();
      const currentView = viewRef.current;
      const numDays = currentView === 'day' ? 1 : 7;
      const dayColWidth = (rect.width - TIME_COL_WIDTH) / numDays;

      const adjustedX = e.clientX - (state.clickOffsetX || 0);
      const adjustedY = e.clientY - (state.clickOffsetY || 0);
      // Target cell detection uses RAW cursor position (not task corner).
      // This ensures the drop zone follows the cursor exactly, not the task's top-left.
      // RTL fix: time column is on the RIGHT → measure relX from the right edge.
      const relX = (rect.right - TIME_COL_WIDTH) - e.clientX;
      const relY = e.clientY - hoursRect.top;

      const dayIndex = Math.max(0, Math.min(numDays - 1, Math.floor(relX / dayColWidth)));

      // Convert relY to time, snapping to 15-min grid
      const firstHour = hours[0] ?? DEFAULT_HOURS[0];
      const lastHour = hours[hours.length - 1] ?? DEFAULT_HOURS[DEFAULT_HOURS.length - 1];
      const rawMinutes = (relY / measuredHourHeightRef.current) * 60 + firstHour * 60;
      const snappedMin = Math.round(rawMinutes / 15) * 15;
      const clamped = Math.max(firstHour * 60, Math.min(lastHour * 60, snappedMin));
      const hour = Math.floor(clamped / 60);
      const minute = clamped % 60;

      const days = currentView === 'day'
        ? [anchorDateRef.current]
        : (weekDaysRef.current || []);
      const currentDay = days[dayIndex] || state.currentDay;
      
      // Update ghost DOM directly — 60fps, no React render
      if (ghostRef.current) {
        ghostRef.current.style.display = 'block';
        ghostRef.current.style.left = (e.clientX - (state.clickOffsetX || 0)) + 'px';
        ghostRef.current.style.top = (e.clientY - (state.clickOffsetY || 0)) + 'px';
        ghostRef.current.style.width = (state.taskWidth || 120) + 'px';
        ghostRef.current.style.height = Math.max(36, (durationForTask(state.task) / 60) * measuredHourHeightRef.current) + 'px';
        ghostRef.current.style.backgroundColor = STATUS_BG[state.task?.status] || '#bfdbfe';
        ghostRef.current.style.borderLeft = `3px solid ${STATUS_BORDER[state.task?.status] || '#2563eb'}`;
        // Update title and time
        const titleEl = ghostRef.current.querySelector('#ghost-title');
        const timeEl = ghostRef.current.querySelector('#ghost-time');
        if (titleEl) { titleEl.style.color = STATUS_TEXT[state.task?.status] || '#1e3a8a'; titleEl.textContent = state.task?.title || 'משימה'; }
        if (timeEl) { timeEl.style.color = STATUS_TEXT[state.task?.status] || '#1e3a8a'; timeEl.textContent = String(hour).padStart(2,'0') + ':' + String(minute).padStart(2,'0'); }
      }

      // Only trigger React re-render when the target TIME SLOT changes (not every pixel)
      // Ghost DOM updates already handle the visual — this just updates the drop zone highlight
      const slotChanged =
        !state.hasMoved ||
        state.currentHour !== hour ||
        state.currentMinute !== minute ||
        !isSameDay(state.currentDay, currentDay);

      const updated = { ...state, hasMoved: true, currentHour: hour, currentMinute: minute, currentDay };
      draggingRef.current = updated;
      if (slotChanged) setDragging(updated);
    };

    const onMouseUp = async () => {
      const state = draggingRef.current;
      if (!state) return;
      setDragging(null);

      if (ghostRef.current) {
        ghostRef.current.style.display = 'none';
      }

      if (!state.hasMoved) {
        return;
      }

      // prevent synthetic click after drag-drop from opening edit modal
      suppressNextClickRef.current = true;

      const task = state.task;
      const newDate = toIsoDate(state.currentDay);
      const newHour = state.currentHour;
      const newMinute = state.currentMinute || 0;
      const newTime = `${String(newHour).padStart(2, '0')}:${String(newMinute).padStart(2, '0')}`;

      // No real change
      if (newDate === task.start_date && newTime === (task.start_time || '00:00')) return;

      // Past-time guard (Israel TZ)
      const nowIsrael = new Date(
        new Date().toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' })
      );
      const targetDt = new Date(`${newDate}T${newTime}:00`);
      if (targetDt < nowIsrael) {
        toast.error('לא ניתן להזיז משימה לזמן שעבר', {
          position: 'bottom-center', autoClose: 2500, rtl: true,
        });
        return;
      }

      // Overlap guard
      const dur = durationForTask(task);
      if (hasDayOverlapRef(task.id, newDate, newTime, dur)) {
        toast.error('אין אפשרות להזיז — חפיפה עם משימה אחרת', {
          position: 'bottom-center', autoClose: 2500, rtl: true,
        });
        return;
      }

      try {
        const currentTask = tasks.find((t) => t.id === state.task.id);
        await axios.put(`${API_URL}/tasks/${state.task.id}`, {
          ...currentTask,
          start_date: newDate,
          start_time: newTime,
        });
        await refreshData();
      } catch {
        toast.error('שמירה נכשלה', { position: 'bottom-center', autoClose: 2000, rtl: true });
      }
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!dragging, refreshData, hours]);

  // ── FEATURE 2: Drag-to-Resize ────────────────────────────────────────────────
  useEffect(() => {
    if (!resizeState?.resizingTaskId) return;

    const onMouseMove = (e) => {
      const s = resizeStateRef.current;
      if (!s) return;
      const deltaY = e.clientY - s.resizeY;
      const steps = Math.round(deltaY / (measuredHourHeightRef.current / 4)); // 1 step = 15 min
      const next = Math.max(15, s.resizeInitialDuration + steps * 15);

      if (next !== s.resizeInitialDuration) {
        didResizeRef.current = true;
      }

      setResizeState((prev) => {
        if (!prev || prev.resizeCurrentDuration === next) return prev;
        const updated = { ...prev, resizeCurrentDuration: next };
        // Keep ref in sync immediately so mouseup reads latest duration
        resizeStateRef.current = updated;
        return updated;
      });
    };

    const onMouseUp = async (e) => {
      const s = resizeStateRef.current;
      if (!s) return;

      e.preventDefault();
      e.stopPropagation();
      suppressNextClickRef.current = true;

      if (s.resizeCurrentDuration !== s.resizeInitialDuration) {
        // Past-end guard
        const nowIsrael = new Date(
          new Date().toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' })
        );
        const endDt = new Date(
          `${s.startDate}T${String(Math.floor((timeToMinutes(s.startTime) + s.resizeCurrentDuration) / 60) % 24).padStart(2, '0')}:${String((timeToMinutes(s.startTime) + s.resizeCurrentDuration) % 60).padStart(2, '0')}:00`
        );
        if (endDt < nowIsrael) {
          toast.error('לא ניתן לשנות משך — הזמן כבר עבר', {
            position: 'bottom-center', autoClose: 2000, rtl: true,
          });
          setResizeState(null);
          return;
        }

        if (hasDayOverlapRef(s.resizingTaskId, s.startDate, s.startTime, s.resizeCurrentDuration)) {
          toast.error('לא ניתן לשנות משך זמן בגלל חפיפה עם משימה אחרת', {
            position: 'bottom-center', autoClose: 2000, rtl: true,
          });
          setResizeState(null);
          return;
        }

        try {
          const currentTask = tasks.find((t) => t.id === s.resizingTaskId);
          await axios.put(`${API_URL}/tasks/${s.resizingTaskId}`, {
            ...currentTask,
            estimated_duration_minutes: s.resizeCurrentDuration,
          });
          await refreshData();
        } catch {
          toast.error('שמירת משך הזמן נכשלה', {
            position: 'bottom-center', autoClose: 2000, rtl: true,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resizeState?.resizingTaskId, refreshData]);

  // ── Quick-create / navigation helpers ────────────────────────────────────────
  const openCreateForm = (date, hour = 9) => {
    const clickedDay = new Date(date);
    clickedDay.setHours(0, 0, 0, 0);
    const todayStart = new Date(
      new Date().toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' })
    );
    todayStart.setHours(0, 0, 0, 0);

    if (clickedDay < todayStart) {
      toast.error('לא ניתן ליצור משימה בתאריך שעבר', {
        position: 'bottom-center', autoClose: 2000, rtl: true,
      });
      return;
    }
    if (clickedDay.getTime() === todayStart.getTime()) {
      const nowIsrael = new Date(
        new Date().toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' })
      );
      if (hour < nowIsrael.getHours()) {
        toast.error('לא ניתן ליצור משימה בשעה שכבר עברה', {
          position: 'bottom-center', autoClose: 2000, rtl: true,
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
      frequency: 'weekly',
    });
  };

  const navLabel =
    view === 'month'
      ? format(anchorDate, 'MMMM yyyy', { locale: he })
      : view === 'week'
      ? `${format(weekDays[0], 'dd/MM')} – ${format(weekDays[6], 'dd/MM')}`
      : format(anchorDate, 'EEEE dd/MM', { locale: he });

  const shift = (dir) => {
    if (view === 'month') setAnchorDate(addDays(anchorDate, dir * 30));
    else if (view === 'week') setAnchorDate(addDays(anchorDate, dir * 7));
    else setAnchorDate(addDays(anchorDate, dir));
  };

  // ── FEATURE 3: Task block renderer (week/day view) ────────────────────────────
  const renderTaskBlock = (task) => {
    const isDraggingThis = dragging?.taskId === task.id && dragging.hasMoved;
    const isResizingThis = resizeState?.resizingTaskId === task.id;

    const currentDuration = isResizingThis
      ? resizeState.resizeCurrentDuration
      : durationForTask(task);

    const height = taskHeightPx(currentDuration);
    const showTimeRange = currentDuration >= 15;

    // Completed-late: orange override (time_delta_minutes > 0 means completed after deadline)
    const isCompletedLate = task.status === 'completed' && task.start_time && task.time_delta_minutes > 0;
    const borderColor = isCompletedLate ? '#ea580c' : (STATUS_BORDER[task.status] || '#3b82f6');
    const bgColor    = isCompletedLate ? '#fed7aa' : (STATUS_BG[task.status]     || '#bfdbfe');
    const textColor  = isCompletedLate ? '#7c2d12' : (STATUS_TEXT[task.status]   || '#1e3a8a');

    // Minute offset within the hour cell
    const minutePart = Number((task.start_time || '00:00').split(':')[1] || 0);
    const topOffset = (minutePart / 60) * measuredHourHeight;

    return (
      <div
        key={task.id}
        className={`
          absolute left-0 w-full rounded-md shadow-sm select-none overflow-hidden
          transition-transform duration-75
          ${isDraggingThis ? 'opacity-20 scale-95 blur-[1px] transition-all duration-150' : 'hover:scale-[1.01] hover:shadow-md'}
          ${!dragging ? 'cursor-grab active:cursor-grabbing' : ''}
        `}
        style={{
          top: `${topOffset}px`,
          height: `${height}px`,
          minHeight: '36px',
          backgroundColor: bgColor,
          color: textColor,
          borderLeft: `3px solid ${borderColor}`,
          outline: isDraggingThis ? `2px dashed ${borderColor}66` : 'none',
          zIndex: isDraggingThis ? 5 : 10,
        }}
        onMouseEnter={(e) => {
          if (!dragging && !resizeState) setTooltip({ task, x: e.clientX, y: e.clientY });
        }}
        onMouseMove={(e) => {
          if (!dragging && !resizeState && tooltip) setTooltip(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);
        }}
        onMouseLeave={() => setTooltip(null)}
        onMouseDown={(e) => {
          setTooltip(null);
          // Resize handle stops propagation, so this won't fire from there
          if (resizeState) return;
          handleTaskMouseDown(e, task);
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (suppressNextClickRef.current) {
            suppressNextClickRef.current = false;
            return;
          }
          if (dragging?.hasMoved || resizeState?.resizingTaskId) return;
          setEditingTask(task);
        }}
      >
        {/* Task content */}
        <div className="px-1.5 py-1 leading-snug overflow-hidden pointer-events-none" style={{ fontSize: '11px' }}>
          <div className="font-semibold" style={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{task.title || 'ללא כותרת'}</div>
          {showTimeRange && (
            <div className="opacity-70 truncate text-[10px] mt-0.5">{formatTimeRange(task.start_time || '00:00', currentDuration)}</div>
          )}
        </div>

        {/* Resize live-duration badge */}
        {isResizingThis && (
          <div
            className="absolute top-0 right-0 m-0.5 px-1 py-0.5 rounded text-white text-[9px] leading-none font-bold z-30 pointer-events-none"
            style={{ background: 'rgba(0,0,0,0.72)' }}
          >
            {formatMinutes(currentDuration)}
          </div>
        )}

        {/* Ghost end-time line for resize */}
        {isResizingThis && (
          <div
            className="absolute left-0 right-0 border-b-2 border-dashed border-blue-500 pointer-events-none z-20"
            style={{ bottom: 0 }}
          />
        )}

        {/* Resize handle — stops propagation so drag-move doesn't fire */}
        <div
          className="absolute bottom-0 left-0 w-full flex items-center justify-center cursor-ns-resize z-20"
          style={{ height: '8px', background: `${borderColor}55` }}
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            didResizeRef.current = false;
            const initialResizeState = {
              resizingTaskId: task.id,
              resizeY: e.clientY,
              resizeInitialDuration: durationForTask(task),
              resizeCurrentDuration: durationForTask(task),
              startDate: task.start_date,
              startTime: task.start_time || '00:00',
            };
            resizeStateRef.current = initialResizeState;
            setResizeState(initialResizeState);
          }}
        >
          <div className="w-8 h-0.5 rounded-full" style={{ background: borderColor }} />
        </div>
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={`יומן - ${employee?.name || ''}`} noScroll>
        <div className="flex flex-col h-full p-4" style={{ minHeight: 0 }}>

          {/* Navigation bar */}
          <div className="flex items-center justify-between gap-2 flex-shrink-0 mb-3">
            <div className="flex items-center gap-2">
              {['day', 'week', 'month'].map((v) => (
                <button
                  key={v}
                  className={`px-3 py-1 rounded text-sm ${view === v ? 'bg-primary text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                  onClick={() => setView(v)}
                >
                  {v === 'day' ? 'יום' : v === 'week' ? 'שבוע' : 'חודש'}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => shift(-1)} className="p-2 bg-gray-100 rounded hover:bg-gray-200">
                <FaChevronRight />
              </button>
              <div className="font-semibold text-sm min-w-[140px] text-center">{navLabel}</div>
              <button onClick={() => shift(1)} className="p-2 bg-gray-100 rounded hover:bg-gray-200">
                <FaChevronLeft />
              </button>
            </div>
          </div>

          {/* Status legend */}
          <div className="flex flex-wrap items-center gap-3 text-xs flex-shrink-0 mb-3">
            {Object.entries(STATUS_COLORS).map(([k, cls]) => (
              <div key={k} className="flex items-center gap-1">
                <span className={`inline-block w-2 h-2 rounded-full ${cls}`} />
                <span className="text-gray-600">{k}</span>
              </div>
            ))}
          </div>

          {/* ── MONTH VIEW ─────────────────────────────────────────────────────── */}
          {view === 'month' && (
            <div className="grid grid-cols-7 border rounded overflow-hidden text-xs">
              {['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map((d) => (
                <div key={d} className="p-2 font-bold bg-gray-50 border-b text-center">{d}</div>
              ))}
              {monthDays.map((date) => {
                const dayTasks = tasksForDate(date);
                return (
                  <div
                    key={date.toISOString()}
                    className={`min-h-[110px] p-1 border cursor-pointer hover:bg-blue-50 transition-colors ${
                      isSameMonth(date, anchorDate) ? 'bg-white' : 'bg-gray-50'
                    }`}
                    onClick={() => openCreateForm(date)}
                  >
                    <div className="text-[11px] mb-1 font-medium">{format(date, 'dd')}</div>
                    <div className="space-y-1">
                      {dayTasks.slice(0, 3).map((task) => (
                        <button
                          key={task.id}
                          onClick={(e) => { e.stopPropagation(); setEditingTask(task); }}
                          className={`w-full text-right text-[10px] text-white px-1 py-0.5 rounded truncate transition-opacity hover:opacity-80 ${STATUS_COLORS[task.status] || 'bg-slate-500'}`}
                          title={titleWithTime(task)}
                        >
                          {titleWithTime(task)}
                        </button>
                      ))}
                      {dayTasks.length > 3 && (
                        <div className="text-[10px] text-blue-600 font-medium">+{dayTasks.length - 3} עוד</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── WEEK / DAY VIEW ────────────────────────────────────────────────── */}
          {(view === 'week' || view === 'day') && (
            <div className="flex flex-col border rounded" style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <div
                ref={gridBodyRef}
                className="flex flex-col"
                // Prevent browser text selection while dragging
                style={{ flex: 1, minHeight: 0, userSelect: dragging?.hasMoved ? 'none' : undefined }}
              >
                {/* Day header row */}
                <div
                  className={`grid bg-gray-50 border-b flex-shrink-0 ${
                    view === 'day'
                      ? 'grid-cols-[80px_1fr]'
                      : 'grid-cols-[80px_repeat(7,minmax(0,1fr))]'
                  }`}
                >
                  <div className="p-2 text-xs" />
                  {(view === 'day' ? [anchorDate] : weekDays).map((d) => (
                    <div
                      key={d.toISOString()}
                      className="p-2 text-xs font-semibold text-center border-r first:border-r-0"
                    >
                      {format(d, 'EEE dd/MM', { locale: he })}
                    </div>
                  ))}
                </div>

                {/* All-day tasks (one-time, no time) — day view only */}
                {view === 'day' && (() => {
                  const allDayTasks = employeeTasks.filter(t =>
                    isSameDay(parseISO(t.start_date), anchorDate) &&
                    (!t.start_time || t.start_time === '' || t.start_time === '00:00') &&
                    Number(t.is_recurring) === 0 &&
                    t.status !== 'not_completed' && t.status !== 'cancelled'
                  );
                  if (allDayTasks.length === 0) return null;
                  return (
                    <div className="border-b bg-blue-50/40 px-2 py-1 flex-shrink-0">
                      <div className="text-xs text-gray-500 mb-1 font-medium">כל היום</div>
                      <div className="flex flex-wrap gap-1">
                        {allDayTasks.map(task => (
                          <div
                            key={task.id}
                            className="text-xs px-2 py-0.5 rounded-full cursor-pointer hover:opacity-80"
                            style={{
                              backgroundColor: STATUS_BG[task.status] || '#bfdbfe',
                              color: STATUS_TEXT[task.status] || '#1e3a8a',
                              border: `1px solid ${STATUS_BORDER[task.status] || '#2563eb'}`,
                            }}
                            onClick={() => setEditingTask(task)}
                          >
                            {task.title || 'ללא כותרת'}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Hour rows */}
                <div ref={hoursBodyRef} className="flex flex-col" style={{ flex: 1, minHeight: 0, overflowY: 'hidden' }}>
                  {hours.map((hour, idx) => (
                    <div key={hour} ref={idx === 0 ? hourRowRef : undefined} className={`grid border-b last:border-b-0 flex-1 ${
                        view === 'day'
                          ? 'grid-cols-[80px_1fr]'
                          : 'grid-cols-[80px_repeat(7,minmax(0,1fr))]'
                      }`}
                    >
                      {/* Time label */}
                      <div className="text-xs p-2 bg-gray-50 border-r text-gray-500">
                        {String(hour).padStart(2, '0')}:00
                      </div>

                      {/* Day cells */}
                      {(view === 'day' ? [anchorDate] : weekDays).map((day) => {
                        const cellTasks = tasksForDate(day).filter(
                          (t) => Number((t.start_time || '00:00').split(':')[0]) === hour
                        );

                        const isTargetCell =
                          dragging?.hasMoved &&
                          dragging.currentDay &&
                          isSameDay(day, dragging.currentDay) &&
                          hour === dragging.currentHour;

                        return (
                          <div
                            key={`${day.toISOString()}-${hour}`}
                            className={`border-r first:border-r-0 relative hover:bg-blue-50/30 transition-colors ${isTargetCell ? 'border-2 border-dashed border-blue-400 bg-blue-50' : ''}`}
                            onClick={() => {
                              if (!dragging) openCreateForm(day, hour);
                            }}
                          >
                            {/* Task blocks */}
                            {isTargetCell && (
                              <div
                                style={{
                                  position: 'absolute',
                                  top: `${((dragging?.currentMinute || 0) / 60) * measuredHourHeight}px`,
                                  left: 2, right: 2,
                                  height: `${taskHeightPx(durationForTask(dragging?.task))}px`,
                                  backgroundColor: STATUS_BG[dragging?.task?.status] || '#bfdbfe',
                                  borderLeft: `3px solid ${STATUS_BORDER[dragging?.task?.status] || '#2563eb'}`,
                                  borderRadius: '4px',
                                  opacity: 0.6,
                                  pointerEvents: 'none',
                                  zIndex: 8,
                                }}
                              />
                            )}
                            {cellTasks.map((task) => renderTaskBlock(task))}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Ghost — always in DOM, hidden when not dragging */}
      <div
        ref={ghostRef}
        style={{
          position: 'fixed',
          display: 'none',
          pointerEvents: 'none',
          zIndex: 9999,
          willChange: 'transform',
          transform: 'rotate(1.5deg) scale(1.05)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
          borderRadius: '6px',
          overflow: 'hidden',
          opacity: 0.92,
          transition: 'none',
        }}
      >
        <div id="ghost-inner" style={{padding:'4px 8px', fontSize:'11px'}}>
          <div id="ghost-title" style={{fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}} />
          <div id="ghost-time" style={{opacity:0.75, fontSize:'10px'}} />
        </div>
      </div>

      {/* Edit task modal */}
      <Modal isOpen={!!editingTask} onClose={() => setEditingTask(null)} title="ערוך משימה">
        {editingTask && (
          <TaskForm task={editingTask} onClose={() => setEditingTask(null)} />
        )}
      </Modal>

      {/* Quick create modal */}
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

      {/* Hover tooltip — clamped strictly within viewport; no overflow possible */}
      {tooltip && !dragging && !resizeState && (() => {
        const TOOLTIP_W = 260;
        const TOOLTIP_MAX_H = 160;
        const MARGIN = 12;
        const vw = document.documentElement.clientWidth;  // excludes scrollbar
        const vh = document.documentElement.clientHeight;

        const left = Math.min(tooltip.x + MARGIN, vw - TOOLTIP_W - 4);
        const top  = Math.min(tooltip.y + MARGIN, vh - TOOLTIP_MAX_H - 4);

        return (
          <div
            className="fixed z-[9999] pointer-events-none rounded-xl shadow-2xl p-3 text-right"
            style={{
              left,
              top,
              width: TOOLTIP_W,
              background: '#1e293b',
              color: '#f1f5f9',
              border: '1px solid #334155',
            }}
          >
            <div className="font-bold text-sm leading-snug mb-1" style={{ color: '#f8fafc' }}>
              {tooltip.task.title || 'ללא כותרת'}
            </div>
            {tooltip.task.description && (
              <div className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: '#94a3b8' }}>
                {tooltip.task.description}
              </div>
            )}
            {tooltip.task.start_time && (
              <div className="text-xs mt-2" style={{ color: '#64748b' }}>
                🕐 {tooltip.task.start_time} · {durationForTask(tooltip.task)} דק׳
              </div>
            )}
            {tooltip.task.status === 'completed' && tooltip.task.time_delta_minutes > 0 && (
              <div className="text-xs mt-1 font-semibold" style={{ color: '#fb923c' }}>
                ⚠️ {tooltip.task.time_delta_text || `איחור של ${tooltip.task.time_delta_minutes} דק׳`}
              </div>
            )}
          </div>
        );
      })()}
    </>
  );
}
