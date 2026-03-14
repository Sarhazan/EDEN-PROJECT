import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  addDays, endOfMonth, endOfWeek, format,
  isSameDay, isSameMonth, parseISO, startOfMonth, startOfWeek
} from 'date-fns';
import { he } from 'date-fns/locale';
import { FaChevronLeft, FaChevronRight, FaWhatsapp } from 'react-icons/fa';
import axios from 'axios';
import Modal from '../shared/Modal';
import TaskForm from '../forms/TaskForm';
import QuickTaskModal from '../forms/QuickTaskModal';
import { useApp } from '../../context/AppContext';
import { toast } from 'react-toastify';
import { API_URL } from '../../config';

const DEFAULT_HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 06:00-21:00
const TIME_COL_WIDTH = 80; // px for left time label column

// ── Status colour maps ────────────────────────────────────────────────────────
const STATUS_COLORS = {
  draft: 'bg-slate-500',
  sent: 'bg-blue-500',
  received: 'bg-cyan-500',
  pending_approval: 'bg-orange-500',
  completed: 'bg-emerald-500',
  not_completed: 'bg-red-500',
};

const STATUS_BG = {
  draft: '#cbd5e1',
  sent: '#bfdbfe',
  received: '#a5f3fc',
  pending_approval: '#fed7aa',
  completed: '#a7f3d0',
  not_completed: '#fecaca',
};

const STATUS_BORDER = {
  draft: '#475569',
  sent: '#2563eb',
  received: '#0891b2',
  pending_approval: '#ea580c',
  completed: '#059669',
  not_completed: '#dc2626',
};

const STATUS_TEXT = {
  draft: '#1e293b',
  sent: '#1e3a8a',
  received: '#164e63',
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
  return `${String(h || 0).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}-${String(eH).padStart(2, '0')}:${String(eM).padStart(2, '0')}`;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function EmployeeCalendarModal({ employee, isOpen, onClose }) {
  const { tasks, refreshData, whatsappConnected } = useApp();

  const [view, setView] = useState('week');
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [isSendingDay, setIsSendingDay] = useState(false);
  const [dragging, setDragging] = useState(null);   // drag-to-move state  { ..., hasConflict: bool }
  const [resizeState, setResizeState] = useState(null); // drag-to-resize state
  const [showRecurringDragDialog, setShowRecurringDragDialog] = useState(false);
  const [pendingDragData, setPendingDragData] = useState(null); // { task, newDate, newTime, dayTasks }
  const [showRecurringResizeDialog, setShowRecurringResizeDialog] = useState(false);
  const [pendingResizeData, setPendingResizeData] = useState(null); // { task, oldDuration, newDuration }
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
    return Array.from({ length: 7 }, (_, i) => addDays(start, i)); // Sun-Sat full week
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

  const taskHeightPx = (dur) => Math.max(20, (dur / 60) * measuredHourHeight);

  const tasksForDate = (date) =>
    employeeTasks.filter((t) => isSameDay(parseISO(t.start_date), date));

  const getTaskOverlaps = (task) => {
    if (!task?.start_date || !task?.start_time) return [];
    const start = timeToMinutes(task.start_time);
    const end = start + durationForTask(task);

    return employeeTasks
      .filter((t) => Number(t.id) !== Number(task.id) && t.start_date === task.start_date)
      .filter((t) => {
        const oStart = timeToMinutes(t.start_time || '00:00');
        const oEnd = oStart + durationForTask(t);
        return start < oEnd && oStart < end;
      })
      .map((t) => ({
        id: t.id,
        title: t.title,
        start_time: t.start_time,
        estimated_duration_minutes: t.estimated_duration_minutes,
        status: t.status,
      }));
  };

  const openEditTask = (task) => {
    const overlapConflicts = getTaskOverlaps(task);
    setEditingTask({ ...task, overlapConflicts });
  };

  const handleSendDay = async () => {
    const dateStr = format(anchorDate, 'yyyy-MM-dd');
    const dayTasks = tasksForDate(anchorDate).filter(
      (t) => t.status === 'draft' && t.start_time && t.start_time !== '00:00'
    );

    if (dayTasks.length === 0) {
      alert('אין משימות לשליחה ביום זה (כל המשימות כבר נשלחו או ללא שעת התחלה)');
      return;
    }

    if (!confirm(`האם לשלוח ${dayTasks.length} משימות ל${employee.name} ליום ${format(anchorDate, 'dd/MM/yyyy')}?`)) return;

    setIsSendingDay(true);
    try {
      const tasksByEmployee = {
        [employee.id]: {
          phone: employee.phone,
          name: employee.name,
          language: employee.language || 'he',
          date: format(anchorDate, 'dd/MM/yyyy'),
          tasks: dayTasks.map((t) => ({
            id: t.id,
            title: t.title,
            description: t.description,
            start_time: t.start_time,
            priority: t.priority || 'normal',
            system_name: t.system_name,
            estimated_duration_minutes: t.estimated_duration_minutes,
            status: t.status,
          })),
        },
      };

      const response = await axios.post(`${API_URL}/whatsapp/send-bulk`, { tasksByEmployee }, { timeout: 120000 });
      const success = (response.data?.results || []).some((r) => r.success && String(r.employeeId) === String(employee.id));

      if (success) {
        await refreshData();
        toast.success(`יום העבודה נשלח ל${employee.name} ✓`);
      } else {
        alert('שגיאה בשליחה: ' + (response.data?.results?.[0]?.error || 'שגיאה לא ידועה'));
      }
    } catch (err) {
      alert('שגיאה: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsSendingDay(false);
    }
  };

  /** Overlap check - reads from ref so it's always fresh inside effects */
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

  // ── Overlap detector for drag (overlap allowed - kept for layout compatibility) ────────────────────────────────
  const checkDragConflict = useCallback(() => false, []);

  // ── Drag save executor (shared by direct drop + recurring scope dialog) ─────
  const executeResizeSave = useCallback(async ({ task, newDuration }, updateScope) => {
    try {
      await axios.put(`${API_URL}/tasks/${task.id}`, {
        ...task,
        estimated_duration_minutes: newDuration,
        update_scope: updateScope,
      });
      await refreshData();
    } catch {
      toast.error('שמירת משך הזמן נכשלה', { position: 'bottom-center', autoClose: 2000, rtl: true });
    }
  }, [refreshData]);

  const executeDragSave = useCallback(async ({ task, newDate, newTime, dayTasks }, updateScope) => {
    try {
      const updates = [];
      for (const t of dayTasks) {
        const origTime = t.isDropped ? null : t.start_time;
        const newH = Math.floor(t.startMin / 60) % 24;
        const newM = t.startMin % 60;
        const newTimeStr = `${String(newH).padStart(2,'0')}:${String(newM).padStart(2,'0')}`;

        if (t.isDropped || origTime !== newTimeStr) {
          const baseTask = tasks.find(x => x.id === t.id) || t;
          updates.push(
            axios.put(`${API_URL}/tasks/${t.id}`, {
              title: baseTask.title,
              description: baseTask.description || '',
              system_id: baseTask.system_id || null,
              employee_id: baseTask.employee_id || null,
              frequency: baseTask.frequency || 'one-time',
              start_date: newDate,
              start_time: newTimeStr,
              due_date: baseTask.due_date || null,
              priority: baseTask.priority || 'normal',
              status: baseTask.status || 'draft',
              is_recurring: baseTask.is_recurring ? 1 : 0,
              weekly_days: Array.isArray(baseTask.weekly_days)
                ? baseTask.weekly_days
                : (baseTask.weekly_days ? JSON.parse(baseTask.weekly_days) : []),
              estimated_duration_minutes: baseTask.estimated_duration_minutes || 30,
              location_id: baseTask.location_id || null,
              building_id: baseTask.building_id || null,
              // Pass scope only for the dragged task itself
              ...(t.isDropped && updateScope ? { update_scope: updateScope } : {}),
            })
          );
        }
      }

      await Promise.all(updates);
      await refreshData();
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'שגיאה לא ידועה';
      console.error('[Calendar drag] Save failed:', msg, err?.response?.data);
      toast.error(`שמירה נכשלה: ${msg}`, { position: 'bottom-center', autoClose: 3000, rtl: true });
    }
  }, [tasks, refreshData]);

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

      // Check overlap for current drop position
      const dropTimeStr  = `${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`;
      const dropDateStr  = toIsoDate(currentDay);
      const taskDur      = durationForTask(state.task);
      const hasConflict  = checkDragConflict(state.task.id, dropDateStr, dropTimeStr, taskDur);

      // Update ghost DOM directly - 60fps, no React render
      if (ghostRef.current) {
        ghostRef.current.style.display = 'block';
        ghostRef.current.style.left = (e.clientX - (state.clickOffsetX || 0)) + 'px';
        ghostRef.current.style.top = (e.clientY - (state.clickOffsetY || 0)) + 'px';
        ghostRef.current.style.width = (state.taskWidth || 120) + 'px';
        ghostRef.current.style.height = Math.max(36, (taskDur / 60) * measuredHourHeightRef.current) + 'px';
        // Red when conflict, normal color otherwise
        ghostRef.current.style.backgroundColor = hasConflict ? '#fee2e2' : (STATUS_BG[state.task?.status] || '#bfdbfe');
        ghostRef.current.style.borderLeft = `3px solid ${hasConflict ? '#dc2626' : (STATUS_BORDER[state.task?.status] || '#2563eb')}`;
        const titleEl = ghostRef.current.querySelector('#ghost-title');
        const timeEl  = ghostRef.current.querySelector('#ghost-time');
        if (titleEl) { titleEl.style.color = hasConflict ? '#7f1d1d' : (STATUS_TEXT[state.task?.status] || '#1e3a8a'); titleEl.textContent = state.task?.title || 'משימה'; }
        if (timeEl)  { timeEl.style.color  = hasConflict ? '#7f1d1d' : (STATUS_TEXT[state.task?.status] || '#1e3a8a'); timeEl.textContent = dropTimeStr; }
      }

      // Only trigger React re-render when the target TIME SLOT changes (not every pixel)
      // Ghost DOM updates already handle the visual - this just updates the drop zone highlight
      const slotChanged =
        !state.hasMoved ||
        state.currentHour !== hour ||
        state.currentMinute !== minute ||
        !isSameDay(state.currentDay, currentDay);

      const updated = { ...state, hasMoved: true, currentHour: hour, currentMinute: minute, currentDay, hasConflict };
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

      const dur = durationForTask(task);
      const dayTasks = [{ ...task, startMin: timeToMinutes(newTime), dur, isDropped: true }];

      // If recurring task - show scope dialog before saving
      if (task.is_recurring) {
        setPendingDragData({ task, newDate, newTime, dayTasks });
        setShowRecurringDragDialog(true);
        return;
      }

      // Non-recurring: save immediately
      await executeDragSave({ task, newDate, newTime, dayTasks }, 'single');
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
          toast.error('לא ניתן לשנות משך - הזמן כבר עבר', {
            position: 'bottom-center', autoClose: 2000, rtl: true,
          });
          setResizeState(null);
          return;
        }

        try {
          const currentTask = tasks.find((t) => t.id === s.resizingTaskId);
          // If recurring → show scope dialog instead of saving directly
          if (currentTask?.is_recurring) {
            setPendingResizeData({
              task: currentTask,
              oldDuration: s.resizeInitialDuration,
              newDuration: s.resizeCurrentDuration,
            });
            setShowRecurringResizeDialog(true);
            setResizeState(null);
            return;
          }
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

    // ── Smart start_time: avoid overlap with existing tasks ──────────────────
    // If a task already occupies the clicked slot, propose its end time instead.
    const dateStr = toIsoDate(date);
    const clickedMin = hour * 60; // e.g. 16:00 → 960
    let smartStartMin = clickedMin;

    employeeTasks
      .filter((t) => t.start_date === dateStr && t.start_time)
      .forEach((t) => {
        const taskStartMin = timeToMinutes(t.start_time);
        const taskDur = Number(t.estimated_duration_minutes) > 0
          ? Number(t.estimated_duration_minutes)
          : 60;
        const taskEndMin = taskStartMin + taskDur;
        // Task overlaps clicked slot: starts at or before click, ends after
        if (taskStartMin <= clickedMin && taskEndMin > clickedMin) {
          smartStartMin = Math.max(smartStartMin, taskEndMin);
        }
      });

    const smartH = Math.min(Math.floor(smartStartMin / 60), 23);
    const smartM = smartStartMin % 60;
    const smartStartTime = `${String(smartH).padStart(2, '0')}:${String(smartM).padStart(2, '0')}`;
    // ────────────────────────────────────────────────────────────────────────

    setEditingTask(null);
    setQuickCreateDefaults({
      title: '',
      employee_id: String(employee.id),
      start_date: dateStr,
      start_time: smartStartTime,
      frequency: 'weekly',
    });
  };

  const navLabel =
    view === 'month'
      ? format(anchorDate, 'MMMM yyyy', { locale: he })
      : view === 'week'
      ? `${format(weekDays[0], 'dd/MM')} - ${format(weekDays[6], 'dd/MM')}`
      : format(anchorDate, 'EEEE dd/MM', { locale: he });

  const shift = (dir) => {
    if (view === 'month') setAnchorDate(addDays(anchorDate, dir * 30));
    else if (view === 'week') setAnchorDate(addDays(anchorDate, dir * 7));
    else setAnchorDate(addDays(anchorDate, dir));
  };

  const getVisualTaskKey = (task) => {
    const idPart = String(task?.id ?? '');
    const fingerprint = [
      task?.employee_id ?? '',
      task?.start_date ?? '',
      task?.start_time ?? '',
      durationForTask(task),
      task?.title ?? '',
      task?.frequency ?? '',
      task?.is_recurring ? 1 : 0,
    ].join('|');
    return { idPart, fingerprint };
  };

  const buildOverlapLayoutByDay = (tasksInDay) => {
    const byId = new Map();
    if (!tasksInDay?.length) return byId;

    // Guard against duplicates from fetch/socket race AND duplicated recurring instances with identical visual fingerprint
    const seenId = new Set();
    const seenFingerprint = new Set();
    const uniqueTasks = [];
    for (const task of tasksInDay) {
      const { idPart, fingerprint } = getVisualTaskKey(task);
      if (!idPart) continue;
      if (seenId.has(idPart)) continue;
      if (seenFingerprint.has(fingerprint)) continue;
      seenId.add(idPart);
      seenFingerprint.add(fingerprint);
      uniqueTasks.push(task);
    }

    const items = uniqueTasks
      .map((task) => {
        const start = timeToMinutes(task.start_time || '00:00');
        const end = start + durationForTask(task);
        return { task, idKey: String(task.id), start, end };
      })
      .sort((a, b) => a.start - b.start || a.end - b.end);

    // Build connected overlap clusters first (so independent time ranges stay full-width)
    const clusters = [];
    let current = [];
    let clusterEnd = -1;

    for (const item of items) {
      if (!current.length || item.start < clusterEnd) {
        current.push(item);
        clusterEnd = Math.max(clusterEnd, item.end);
      } else {
        clusters.push(current);
        current = [item];
        clusterEnd = item.end;
      }
    }
    if (current.length) clusters.push(current);

    for (const cluster of clusters) {
      const active = []; // { end, col, id }
      const temp = new Map();
      let clusterCols = 1;

      for (const item of cluster) {
        for (let k = active.length - 1; k >= 0; k--) {
          if (active[k].end <= item.start) active.splice(k, 1);
        }

        const usedCols = new Set(active.map((x) => x.col));
        let col = 0;
        while (usedCols.has(col)) col += 1;

        active.push({ end: item.end, col, id: item.idKey });
        clusterCols = Math.max(clusterCols, col + 1);

        // overlap must be with ANOTHER task id (never with itself)
        const isOverlap = active.some((a) => a.id !== item.idKey);
        temp.set(item.idKey, { col, overlap: isOverlap });

        if (isOverlap) {
          for (const a of active) {
            const prev = temp.get(a.id) || { col: a.col, overlap: false };
            temp.set(a.id, { ...prev, overlap: true });
          }
        }
      }

      for (const item of cluster) {
        const lane = temp.get(item.idKey) || { col: 0, overlap: false };
        byId.set(item.idKey, { ...lane, cols: clusterCols });
      }
    }

    return byId;
  };

  const layoutOverlappingTasks = (tasksInCell, layoutById) => {
    if (!tasksInCell?.length) return [];

    const seenId = new Set();
    const seenFingerprint = new Set();
    const uniqueInCell = [];
    for (const task of tasksInCell) {
      const { idPart, fingerprint } = getVisualTaskKey(task);
      if (!idPart) continue;
      if (seenId.has(idPart)) continue;
      if (seenFingerprint.has(fingerprint)) continue;
      seenId.add(idPart);
      seenFingerprint.add(fingerprint);
      uniqueInCell.push(task);
    }

    return uniqueInCell.map((task) => ({ task, ...(layoutById?.get(String(task.id)) || { col: 0, overlap: false, cols: 1 }) }));
  };

  // ── FEATURE 3: Task block renderer (week/day view) ────────────────────────────
  const renderTaskBlock = (task, lane = { col: 0, cols: 1, overlap: false }) => {
    const isDraggingThis = dragging?.taskId === task.id && dragging.hasMoved;
    const isResizingThis = resizeState?.resizingTaskId === task.id;

    const currentDuration = isResizingThis
      ? resizeState.resizeCurrentDuration
      : durationForTask(task);

    const height = taskHeightPx(currentDuration);
    const showTimeRange = currentDuration >= 15;

    // Completed-late: orange override (time_delta_minutes > 0 means completed after deadline)
    const isCompletedLate = task.status === 'completed' && task.start_time && task.time_delta_minutes > 0;
    const isOverlap = !!lane.overlap;
    const borderColor = isOverlap
      ? '#dc2626'
      : (isCompletedLate ? '#ea580c' : (STATUS_BORDER[task.status] || '#3b82f6'));
    const bgColor = isOverlap
      ? '#fee2e2'
      : (isCompletedLate ? '#fed7aa' : (STATUS_BG[task.status] || '#bfdbfe'));
    const textColor = isOverlap
      ? '#7f1d1d'
      : (isCompletedLate ? '#7c2d12' : (STATUS_TEXT[task.status] || '#1e3a8a'));

    // Minute offset within the hour cell
    const minutePart = Number((task.start_time || '00:00').split(':')[1] || 0);
    const topOffset = (minutePart / 60) * measuredHourHeight;

    return (
      <div
        key={task.id}
        className={`
          absolute rounded-md shadow-sm select-none overflow-hidden
          transition-transform duration-75
          ${isDraggingThis ? 'opacity-20 scale-95 blur-[1px] transition-all duration-150' : 'hover:scale-[1.01] hover:shadow-md'}
          ${!dragging ? 'cursor-grab active:cursor-grabbing' : ''}
        `}
        style={{
          top: `${topOffset}px`,
          left: `calc(${(lane.col * 100) / (lane.cols || 1)}% + 1px)`,
          width: `calc(${100 / (lane.cols || 1)}% - 2px)`,
          height: `${height}px`,
          minHeight: '20px',
          backgroundColor: bgColor,
          color: textColor,
          borderLeft: `3px solid ${borderColor}`,
          outline: isDraggingThis ? `2px dashed ${borderColor}66` : 'none',
          zIndex: isDraggingThis ? 50 : 10 + lane.col,
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
          openEditTask(task);
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

        {/* Resize handle - stops propagation so drag-move doesn't fire */}
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
              <button
                onClick={whatsappConnected ? handleSendDay : undefined}
                disabled={isSendingDay || !whatsappConnected}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-sm text-white transition-colors ${
                  whatsappConnected
                    ? 'bg-green-500 hover:bg-green-600'
                    : 'bg-gray-300 cursor-not-allowed'
                } disabled:opacity-60`}
                title={whatsappConnected ? `שלח את יום העבודה של ${employee?.name} ב-WhatsApp` : 'WhatsApp לא מחובר'}
              >
                <FaWhatsapp className="text-base" />
                {isSendingDay ? 'שולח...' : `שלח יום ${format(anchorDate, 'dd/MM')}`}
              </button>
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
                    onClick={() => {
                      if (suppressNextClickRef.current) {
                        suppressNextClickRef.current = false;
                        return;
                      }
                      openCreateForm(date);
                    }}
                  >
                    <div className="text-[11px] mb-1 font-medium">{format(date, 'dd')}</div>
                    <div className="space-y-1">
                      {dayTasks.slice(0, 3).map((task) => (
                        <button
                          key={task.id}
                          onClick={(e) => { e.stopPropagation(); openEditTask(task); }}
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
                style={{ flex: 1, minHeight: 0, overflow: 'hidden', userSelect: dragging?.hasMoved ? 'none' : undefined }}
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

                {/* All-day tasks (one-time, no time) - week view */}
                {view === 'week' && (() => {
                  const hasAnyAllDay = weekDays.some(day =>
                    employeeTasks.some(t =>
                      isSameDay(parseISO(t.start_date), day) &&
                      (!t.start_time || t.start_time === '' || t.start_time === '00:00') &&
                      Number(t.is_recurring) === 0 &&
                      t.status !== 'cancelled'
                    )
                  );
                  if (!hasAnyAllDay) return null;
                  return (
                    <div className={`grid border-b bg-blue-50/30 flex-shrink-0 grid-cols-[80px_repeat(7,minmax(0,1fr))]`}>
                      <div className="text-xs p-1.5 bg-gray-50 border-r text-gray-500 font-medium">כל היום</div>
                      {weekDays.map(day => {
                        const dayAllDay = employeeTasks.filter(t =>
                          isSameDay(parseISO(t.start_date), day) &&
                          (!t.start_time || t.start_time === '' || t.start_time === '00:00') &&
                          Number(t.is_recurring) === 0 &&
                          t.status !== 'cancelled'
                        );
                        return (
                          <div key={day.toISOString()} className="border-r first:border-r-0 p-0.5 min-h-[24px]">
                            {dayAllDay.map(task => (
                              <div
                                key={task.id}
                                className="text-[10px] px-1 py-0.5 rounded mb-0.5 truncate cursor-pointer hover:opacity-80"
                                style={{
                                  backgroundColor: STATUS_BG[task.status] || '#bfdbfe',
                                  color: STATUS_TEXT[task.status] || '#1e3a8a',
                                  border: `1px solid ${STATUS_BORDER[task.status] || '#2563eb'}`,
                                }}
                                onClick={() => openEditTask(task)}
                                title={task.title}
                              >
                                {task.title || 'ללא כותרת'}

                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* All-day tasks (one-time, no time) - day view only */}
                {view === 'day' && (() => {
                  const allDayTasks = employeeTasks.filter(t =>
                    isSameDay(parseISO(t.start_date), anchorDate) &&
                    (!t.start_time || t.start_time === '' || t.start_time === '00:00') &&
                    Number(t.is_recurring) === 0 &&
                    t.status !== 'cancelled'
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
                            onClick={() => openEditTask(task)}
                          >
                            {task.title || 'ללא כותרת'}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Hour rows */}
                <div ref={hoursBodyRef} className="flex flex-col" style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
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
                        const dayTasks = tasksForDate(day);
                        const overlapLayoutById = buildOverlapLayoutByDay(dayTasks);
                        const cellTasks = dayTasks.filter(
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
                            className={`border-r first:border-r-0 relative hover:bg-blue-50/30 transition-colors ${isTargetCell ? (dragging?.hasConflict ? 'bg-red-50/60' : 'bg-blue-50/60') : ''}`}
                            onClick={() => {
                              if (suppressNextClickRef.current) {
                                suppressNextClickRef.current = false;
                                return;
                              }
                              if (!dragging) openCreateForm(day, hour);
                            }}
                          >
                            {/* Task blocks */}
                            {isTargetCell && (
                              <>
                                {/* Dashed indicator line - aligned exactly to drop position */}
                                <div
                                  style={{
                                    position: 'absolute',
                                    top: `${((dragging?.currentMinute || 0) / 60) * measuredHourHeight}px`,
                                    left: 0, right: 0,
                                    borderTop: `2px dashed ${dragging?.hasConflict ? '#dc2626' : '#60a5fa'}`,
                                    pointerEvents: 'none',
                                    zIndex: 9,
                                  }}
                                />
                                {/* Ghost preview block */}
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
                              </>
                            )}
                            {layoutOverlappingTasks(cellTasks, overlapLayoutById).map(({ task, col, cols, overlap }) => renderTaskBlock(task, { col, cols, overlap }))}
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

      {/* Recurring drag scope dialog */}
      {showRecurringDragDialog && pendingDragData && (() => {
        const { task, newDate, newTime } = pendingDragData;
        const fmtDate = (iso) => {
          if (!iso) return '-';
          const [y, m, d] = iso.split('-');
          return `${d}.${m}`;
        };
        const dayNames = ['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳'];
        const dayName = (iso) => {
          if (!iso) return '';
          const [y, m, d] = iso.split('-').map(Number);
          return 'יום ' + dayNames[new Date(y, m - 1, d).getDay()];
        };
        const dateChanged = task.start_date !== newDate;
        const timeChanged = (task.start_time || '00:00') !== newTime;
        return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowRecurringDragDialog(false); setPendingDragData(null); }} />
            <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm space-y-4" dir="rtl">
              <h3 className="text-lg font-bold text-gray-900 font-alef">עדכון משימה חוזרת</h3>

              {/* Change summary card */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 border border-gray-100">
                <p className="font-semibold text-gray-800 text-sm truncate">📋 {task.title}</p>
                {dateChanged && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>📅</span>
                    <span className="text-gray-400">{dayName(task.start_date)} {fmtDate(task.start_date)}</span>
                    <span className="text-gray-400">←</span>
                    <span className="font-medium text-gray-800">{dayName(newDate)} {fmtDate(newDate)}</span>
                  </div>
                )}
                {timeChanged && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>🕐</span>
                    <span className="text-gray-400">{task.start_time || '00:00'}</span>
                    <span className="text-gray-400">←</span>
                    <span className="font-medium text-gray-800">{newTime}</span>
                  </div>
                )}
              </div>

              <p className="text-sm text-gray-600">אילו משימות ברצונך לעדכן?</p>
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => { setShowRecurringDragDialog(false); executeDragSave(pendingDragData, 'single'); setPendingDragData(null); }}
                  className="w-full bg-blue-600 text-white rounded-xl py-3 font-medium hover:bg-blue-700 active:scale-95 transition-all"
                >
                  משימה זו בלבד
                </button>
                <button
                  type="button"
                  onClick={() => { setShowRecurringDragDialog(false); executeDragSave(pendingDragData, 'all'); setPendingDragData(null); }}
                  className="w-full bg-indigo-600 text-white rounded-xl py-3 font-medium hover:bg-indigo-700 active:scale-95 transition-all"
                >
                  כל המשימות החוזרות
                </button>
                <button
                  type="button"
                  onClick={() => { setShowRecurringDragDialog(false); setPendingDragData(null); }}
                  className="w-full border border-gray-300 text-gray-700 rounded-xl py-3 font-medium hover:bg-gray-50 active:scale-95 transition-all"
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Recurring resize scope dialog */}
      {showRecurringResizeDialog && pendingResizeData && (() => {
        const { task, oldDuration, newDuration } = pendingResizeData;
        const fmtDur = (min) => {
          if (min < 60) return `${min} דק׳`;
          const h = Math.floor(min / 60);
          const m = min % 60;
          return m > 0 ? `${h}:${String(m).padStart(2,'0')} שע׳` : `${h} שע׳`;
        };
        return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowRecurringResizeDialog(false); setPendingResizeData(null); }} />
            <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm space-y-4" dir="rtl">
              <h3 className="text-lg font-bold text-gray-900 font-alef">עדכון משימה חוזרת</h3>

              {/* Change summary card */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 border border-gray-100">
                <p className="font-semibold text-gray-800 text-sm truncate">📋 {task.title}</p>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>⏱️</span>
                  <span className="text-gray-400">{fmtDur(oldDuration)}</span>
                  <span className="text-gray-400">←</span>
                  <span className="font-medium text-gray-800">{fmtDur(newDuration)}</span>
                </div>
              </div>

              <p className="text-sm text-gray-600">אילו משימות ברצונך לעדכן?</p>
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => { setShowRecurringResizeDialog(false); executeResizeSave(pendingResizeData, 'single'); setPendingResizeData(null); }}
                  className="w-full bg-blue-600 text-white rounded-xl py-3 font-medium hover:bg-blue-700 active:scale-95 transition-all"
                >
                  משימה זו בלבד
                </button>
                <button
                  type="button"
                  onClick={() => { setShowRecurringResizeDialog(false); executeResizeSave(pendingResizeData, 'all'); setPendingResizeData(null); }}
                  className="w-full bg-indigo-600 text-white rounded-xl py-3 font-medium hover:bg-indigo-700 active:scale-95 transition-all"
                >
                  כל המשימות החוזרות
                </button>
                <button
                  type="button"
                  onClick={() => { setShowRecurringResizeDialog(false); setPendingResizeData(null); }}
                  className="w-full border border-gray-300 text-gray-700 rounded-xl py-3 font-medium hover:bg-gray-50 active:scale-95 transition-all"
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Ghost - always in DOM, hidden when not dragging */}
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
          forceOneTime={false}
          onClose={() => {
            setQuickCreateDefaults(null);
            refreshData();
          }}
        />
      )}

      {/* Hover tooltip - clamped strictly within viewport; no overflow possible */}
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
