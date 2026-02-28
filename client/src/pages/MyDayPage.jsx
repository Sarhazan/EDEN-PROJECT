import { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { format, isBefore, startOfDay, addDays, isSameDay } from 'date-fns';
import { he } from 'date-fns/locale';
import { FaCalendarDay, FaPaperPlane, FaDatabase, FaTrash } from 'react-icons/fa';
import TaskCard from '../components/shared/TaskCard';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import '../components/forms/datepicker-custom.css';
import axios from 'axios';
import { Resizable } from 're-resizable';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';
const SHOW_DATA_CONTROLS = import.meta.env.DEV || import.meta.env.VITE_ENV === 'test' || import.meta.env.VITE_ENV === 'local';

export default function MyDayPage() {
  const { tasks, systems, employees, locations, setIsTaskModalOpen, setEditingTask, updateTaskStatus, seedData, clearData } = useApp();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const today = startOfDay(new Date());
  const [isSendingBulk, setIsSendingBulk] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showAdvancedStats, setShowAdvancedStats] = useState(false);
  const [timelineRangeDays, setTimelineRangeDays] = useState(7);
  const [highlightTaskId, setHighlightTaskId] = useState(null);
  const [pendingNavigateTaskId, setPendingNavigateTaskId] = useState(null);
  const navigateRetryRef = useRef(0);

  // Filter states
  const [filterCategory, setFilterCategory] = useState('manager'); // default: manager view
  const [filterValue, setFilterValue] = useState(''); // The specific value within the selected category
  const [taskSearch, setTaskSearch] = useState('');

  // Star filter state from localStorage
  const [starFilter, setStarFilter] = useState(() => {
    return localStorage.getItem('starFilter') === 'true';
  });

  // Manager filter state — default ON
  const [managerFilter, setManagerFilter] = useState(() => {
    const stored = localStorage.getItem('myDayManagerFilter');
    return stored === null ? true : stored === 'true'; // default true for new users
  });
  const [managerEmployeeId, setManagerEmployeeId] = useState(null);

  // Column widths state with localStorage initialization
  const [columnWidths, setColumnWidths] = useState(() => {
    const stored = localStorage.getItem('myDayColumnWidths');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse column widths:', e);
      }
    }
    // Default: 60% for left column, right column uses flex: 1
    return { left: '60%', right: 'auto' };
  });

  // Listen to localStorage changes for star filter (cross-tab sync) and custom event (same-tab sync)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'starFilter') {
        setStarFilter(e.newValue === 'true');
      }
    };

    const handleStarFilterChanged = (e) => {
      setStarFilter(e.detail.value);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('starFilterChanged', handleStarFilterChanged);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('starFilterChanged', handleStarFilterChanged);
    };
  }, []);

  // Navigate to created task only when user explicitly clicks CTA in toast
  useEffect(() => {
    const parseISODate = (value) => {
      if (!value) return null;
      const [year, month, day] = value.split('-').map(Number);
      if (!year || !month || !day) return null;
      return new Date(year, month - 1, day);
    };

    const handleNavigateToTask = (e) => {
      const { taskId, startDate, source } = e.detail || {};
      if (!taskId || !startDate) return;
      if (source !== 'toast-button') return;

      const taskDate = parseISODate(startDate);
      if (taskDate) setSelectedDate(taskDate);

      setHighlightTaskId(taskId);
      setPendingNavigateTaskId(taskId);
      navigateRetryRef.current = 0;
    };

    window.addEventListener('myday:navigate-to-task', handleNavigateToTask);
    return () => window.removeEventListener('myday:navigate-to-task', handleNavigateToTask);
  }, []);

  // Robust navigation to created task: wait for filtered lists/data render
  useEffect(() => {
    if (!pendingNavigateTaskId) return;

    const taskId = pendingNavigateTaskId;
    const maxRetries = 20;
    const retryDelayMs = 250;

    const tryScroll = () => {
      const el = document.getElementById(`task-${taskId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => setHighlightTaskId(null), 4500);
        setPendingNavigateTaskId(null);
        navigateRetryRef.current = 0;
        return;
      }

      navigateRetryRef.current += 1;
      if (navigateRetryRef.current >= maxRetries) {
        // Stop retrying but keep date change
        setTimeout(() => setHighlightTaskId(null), 2500);
        setPendingNavigateTaskId(null);
        navigateRetryRef.current = 0;
        return;
      }

      setTimeout(tryScroll, retryDelayMs);
    };

    tryScroll();
  }, [pendingNavigateTaskId, tasks, selectedDate, filterCategory, filterValue, starFilter]);

  // Debounced localStorage save for column widths
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      localStorage.setItem('myDayColumnWidths', JSON.stringify(columnWidths));
    }, 100); // 100ms debounce

    return () => clearTimeout(timeoutId);
  }, [columnWidths]);

  // Load manager employee ID — from localStorage first (instant), then sync from DB
  useEffect(() => {
    // Instant load from localStorage
    const cached = localStorage.getItem('manager_employee_id');
    if (cached) setManagerEmployeeId(parseInt(cached, 10));

    // Sync from DB (source of truth)
    axios.get(`${API_URL}/accounts/settings/manager_employee_id`)
      .then(res => {
        if (res.data.value) {
          const id = parseInt(res.data.value, 10);
          setManagerEmployeeId(id);
          localStorage.setItem('manager_employee_id', res.data.value);
        }
      })
      .catch(() => {});

    // Listen for real-time manager changes from Settings page
    const handleManagerChanged = (e) => {
      const newId = e.detail?.id ? parseInt(e.detail.id, 10) : null;
      setManagerEmployeeId(newId);
    };
    window.addEventListener('manager:changed', handleManagerChanged);
    return () => window.removeEventListener('manager:changed', handleManagerChanged);
  }, []);

  // Persist manager filter state
  const toggleManagerFilter = () => {
    setManagerFilter(prev => {
      const next = !prev;
      localStorage.setItem('myDayManagerFilter', String(next));
      return next;
    });
  };

  // Update current time every minute to refresh countdown displays
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, []);

  const handleEdit = (task) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  const renderTaskCard = (task) => {
    const isHighlighted = String(highlightTaskId) === String(task.id);

    return (
      <div
        id={`task-${task.id}`}
        key={task.id}
        className={isHighlighted ? 'rounded-lg ring-2 ring-blue-400 ring-offset-2 transition-all' : ''}
      >
        <TaskCard task={task} onEdit={handleEdit} forceExpand={isHighlighted} />
      </div>
    );
  };

  // Reset column widths to default
  const handleResetColumnWidths = () => {
    const defaultWidths = { left: '60%', right: 'auto' };
    setColumnWidths(defaultWidths);
    localStorage.setItem('myDayColumnWidths', JSON.stringify(defaultWidths));
  };

  // Handle filter category change (reset value when category changes)
  const handleCategoryChange = (category) => {
    setFilterCategory(category);
    setFilterValue(''); // Reset value when category changes
  };

  // Handle bulk send all tasks
  const handleApproveTask = async (taskId) => {
    try {
      await updateTaskStatus(taskId, 'completed');
    } catch (error) {
      alert('שגיאה: ' + error.message);
    }
  };

  const handleSendAllTasks = async () => {
    // Get current time
    const now = new Date();
    const currentTime = format(now, 'HH:mm');

    // Query ALL tasks for the selected date directly (ignore UI filters for bulk send)
    // This ensures bulk send works regardless of active status/priority/system/employee filters
    const allTasksForDate = tasks.filter((t) =>
      shouldTaskAppearOnDate(t, selectedDate)
    );

    // Filter tasks to send (not sent yet, and time hasn't passed)
    let tasksToSend = allTasksForDate.filter(task => {
      // Only draft tasks (not sent yet)
      if (task.status !== 'draft') return false;

      // Must have employee
      if (!task.employee_id) return false;

      // Check if task time hasn't passed
      if (isSameDay(new Date(task.start_date), selectedDate)) {
        // If it's today, check if time hasn't passed
        if (task.start_time < currentTime) return false;
      }

      return true;
    });

    // If employee filter is active, respect it for bulk send
    if (filterCategory === 'employee' && filterValue) {
      if (filterValue === 'general') {
        tasksToSend = tasksToSend.filter((t) => !t.employee_id);
      } else {
        tasksToSend = tasksToSend.filter((t) => t.employee_id === parseInt(filterValue));
      }
    }

    if (tasksToSend.length === 0) {
      alert('אין משימות לשליחה (כל המשימות כבר נשלחו או שהזמן עבר)');
      return;
    }

    // Group tasks by employee
    const tasksByEmployee = {};
    tasksToSend.forEach(task => {
      if (!tasksByEmployee[task.employee_id]) {
        const employee = employees.find(emp => emp.id === task.employee_id);
        if (!employee) return;

        tasksByEmployee[task.employee_id] = {
          phone: employee.phone,
          name: employee.name,
          tasks: [],
          date: format(new Date(task.start_date), 'dd/MM/yyyy'),
          language: employee.language || 'he'
        };
      }

      tasksByEmployee[task.employee_id].tasks.push({
        id: task.id,
        title: task.title,
        description: task.description,
        start_time: task.start_time,
        priority: task.priority || 'normal',
        system_name: task.system_name,
        estimated_duration_minutes: task.estimated_duration_minutes,
        status: task.status
      });
    });

    // Add extra tasks (one-time, no start_time) for each employee
    const extraTasks = tasks.filter(t =>
      t.employee_id &&
      t.start_date === format(selectedDate, 'yyyy-MM-dd') &&
      (!t.start_time || t.start_time === '' || t.start_time === '00:00') &&
      Number(t.is_recurring) === 0 &&
      !['not_completed', 'cancelled', 'completed', 'sent'].includes(t.status)
    );

    for (const task of extraTasks) {
      if (!task.employee_id || !tasksByEmployee[task.employee_id]) continue;
      if (!tasksByEmployee[task.employee_id].extraTasks) {
        tasksByEmployee[task.employee_id].extraTasks = [];
      }
      tasksByEmployee[task.employee_id].extraTasks.push({
        id: task.id,
        title: task.title,
        description: task.description,
      });
    }

    const employeeCount = Object.keys(tasksByEmployee).length;
    const confirmMessage = filterCategory === 'employee' && filterValue
      ? `האם לשלוח ${tasksToSend.length} משימות ל-${tasksByEmployee[Object.keys(tasksByEmployee)[0]]?.name}?`
      : `האם לשלוח ${tasksToSend.length} משימות ל-${employeeCount} עובדים?`;

    if (!confirm(confirmMessage)) return;

    setIsSendingBulk(true);

    try {
      const response = await axios.post(`${API_URL}/whatsapp/send-bulk`, {
        tasksByEmployee
      }, { timeout: 120000 }); // 2 minute timeout for bulk operations

      // Update status only for employees that were actually sent successfully
      const successfulEmployeeIds = (response.data?.results || [])
        .filter((r) => r.success)
        .map((r) => String(r.employeeId));

      const sentTaskIds = successfulEmployeeIds.flatMap((employeeId) => {
        const group = tasksByEmployee[employeeId];
        return group?.tasks?.map((t) => t.id) || [];
      });

      for (const taskId of sentTaskIds) {
        await updateTaskStatus(taskId, 'sent');
      }

      alert(response.data.message);
    } catch (error) {
      alert('שגיאה: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsSendingBulk(false);
    }
  };

  const isRecurringTask = (task) => Number(task?.is_recurring) === 1;
  const isTaskClosed = (task) => ['completed', 'not_completed'].includes(task?.status);

  // Helper function to check if a task should appear on the selected date
  const shouldTaskAppearOnDate = (task, date) => {
    // Closed tasks should stay on their original day only
    if (isTaskClosed(task)) {
      return isSameDay(new Date(task.start_date), date);
    }

    // One-time tasks: check exact date match
    if (!isRecurringTask(task)) {
      return isSameDay(new Date(task.start_date), date);
    }

    // Recurring tasks: use EXACT date match only.
    // The server pre-generates one DB instance per occurrence date.
    // Using frequency-based logic here causes every past instance to "spill"
    // onto all future matching dates → duplicates.
    return isSameDay(new Date(task.start_date), date);
  };

  // Calculate statistics and filter tasks
  const stats = useMemo(() => {
    // Filter tasks for selected date (excluding completed tasks)
    let todayTasks = tasks.filter((t) =>
      shouldTaskAppearOnDate(t, selectedDate) &&
      !isTaskClosed(t)
    );

    // Apply star filter to statistics if active
    if (starFilter) {
      todayTasks = todayTasks.filter((t) => t.is_starred === 1);
    }

    // 1. Total tasks for today (excluding completed)
    const totalToday = todayTasks.length;

    // 2. Tasks by priority (today only)
    const urgentToday = todayTasks.filter((t) => t.priority === 'urgent').length;
    const normalToday = todayTasks.filter((t) => t.priority === 'normal').length;
    const optionalToday = todayTasks.filter((t) => t.priority === 'optional').length;

    // 3. Tasks by system (today only)
    const tasksBySystem = {};
    todayTasks.forEach((task) => {
      if (task.system_id) {
        tasksBySystem[task.system_id] = (tasksBySystem[task.system_id] || 0) + 1;
      }
    });
    const recurringTasksCount = todayTasks.filter((t) => isRecurringTask(t)).length;
    const oneTimeTasksCount = todayTasks.filter((t) => !isRecurringTask(t)).length;

    // 4. Tasks by status (today only, excluding completed)
    const newTasks = todayTasks.filter((t) => t.status === 'draft').length;
    const sentTasks = todayTasks.filter((t) => t.status === 'sent').length;
    const inProgressTasks = todayTasks.filter((t) => t.status === 'in_progress').length;

    // 5. Count completed tasks separately for completion rate
    let completedTasks = tasks.filter((t) =>
      shouldTaskAppearOnDate(t, selectedDate) &&
      isTaskClosed(t)
    );
    // Apply star filter to completed tasks too
    if (starFilter) {
      completedTasks = completedTasks.filter((t) => t.is_starred === 1);
    }
    const completedCount = completedTasks.length;

    // Completion rate calculation (completed / (uncompleted + completed))
    const totalIncludingCompleted = totalToday + completedCount;
    const completionRate =
      totalIncludingCompleted > 0 ? Math.round((completedCount / totalIncludingCompleted) * 100) : 0;

    return {
      total: totalToday,
      byPriority: {
        urgent: urgentToday,
        normal: normalToday,
        optional: optionalToday
      },
      bySystem: tasksBySystem,
      recurringTasks: recurringTasksCount,
      oneTimeTasks: oneTimeTasksCount,
      byStatus: {
        new: newTasks,
        sent: sentTasks,
        inProgress: inProgressTasks,
        completed: completedCount
      },
      completed: completedCount,
      completionRate
    };
  }, [tasks, selectedDate, starFilter]);

  const isSelectedDateToday = isSameDay(selectedDate, new Date());
  const isTaskSearchActive = isSelectedDateToday && taskSearch.trim().length > 0;

  useEffect(() => {
    if (!isSelectedDateToday && taskSearch) {
      setTaskSearch('');
    }
  }, [isSelectedDateToday, taskSearch]);

  // Dedicated open-task counters for the real current day (independent from selectedDate)
  const todayOpenStats = useMemo(() => {
    let todayOpenTasks = tasks.filter((t) =>
      shouldTaskAppearOnDate(t, new Date()) &&
      !isTaskClosed(t)
    );

    if (starFilter) {
      todayOpenTasks = todayOpenTasks.filter((t) => t.is_starred === 1);
    }

    return {
      total: todayOpenTasks.length,
      byPriority: {
        urgent: todayOpenTasks.filter((t) => t.priority === 'urgent').length,
        normal: todayOpenTasks.filter((t) => t.priority === 'normal').length,
        optional: todayOpenTasks.filter((t) => t.priority === 'optional').length
      }
    };
  }, [tasks, starFilter]);

  const pendingApprovalTasks = useMemo(() =>
    tasks.filter(t => t.status === 'pending_approval'),
    [tasks]
  );

  // Filter recurring tasks (all systems including general, selected date, not completed) and sort by time
  const recurringTasks = useMemo(() => {
    const searchTerm = taskSearch.trim().toLowerCase();
    const isTodaySearch = isSameDay(selectedDate, new Date()) && searchTerm.length > 0;

    let filtered = tasks.filter((t) => {
      if (t.status === 'completed' || !isRecurringTask(t)) return false;

      // Manager filter: show only recurring tasks assigned to the manager
      if (filterCategory === 'manager' && managerEmployeeId) {
        if (Number(t.employee_id) !== Number(managerEmployeeId)) return false;
      }

      if (isTodaySearch) {
        const haystack = `${t.title || ''} ${t.description || ''}`.toLowerCase();
        return haystack.includes(searchTerm);
      }

      return shouldTaskAppearOnDate(t, selectedDate);
    });

    // Apply star filter
    if (starFilter) {
      // Show only starred tasks, exclude completed
      filtered = filtered.filter((t) => t.is_starred === 1 && t.status !== 'completed');
    }

    // Apply filters based on selected category and value
    if (filterCategory && filterValue) {
      switch (filterCategory) {
        case 'priority':
          filtered = filtered.filter((t) => t.priority === filterValue);
          break;
        case 'system':
          filtered = filtered.filter((t) => t.system_id === parseInt(filterValue));
          break;
        case 'status':
          filtered = filtered.filter((t) => t.status === filterValue);
          break;
        case 'employee':
          if (filterValue === 'general') {
            filtered = filtered.filter((t) => !t.employee_id);
          } else {
            filtered = filtered.filter((t) => t.employee_id === parseInt(filterValue));
          }
          break;
        case 'location':
          if (filterValue === 'none') {
            filtered = filtered.filter((t) => !t.location_id);
          } else {
            filtered = filtered.filter((t) => t.location_id === parseInt(filterValue));
          }
          break;
      }
    }

    if (isTodaySearch) {
      const today = startOfDay(new Date());
      const nearestBySeries = new Map();

      filtered.forEach((task) => {
        const taskDate = startOfDay(new Date(task.start_date));
        if (isBefore(taskDate, today)) return;

        const seriesKey = task.parent_task_id || `${task.title}|${task.frequency}|${task.start_time}|${task.employee_id || ''}|${task.system_id || ''}`;
        const existing = nearestBySeries.get(seriesKey);

        if (!existing) {
          nearestBySeries.set(seriesKey, task);
          return;
        }

        const existingDate = startOfDay(new Date(existing.start_date));
        if (
          isBefore(taskDate, existingDate) ||
          (isSameDay(taskDate, existingDate) && (task.start_time || '00:00').localeCompare(existing.start_time || '00:00') < 0)
        ) {
          nearestBySeries.set(seriesKey, task);
        }
      });

      filtered = Array.from(nearestBySeries.values());
    }

    return filtered.sort((a, b) => {
      // Sort by date first, then by time
      const dateCompare = new Date(a.start_date) - new Date(b.start_date);
      if (dateCompare !== 0) return dateCompare;

      const timeA = a.start_time || '00:00';
      const timeB = b.start_time || '00:00';
      return timeA.localeCompare(timeB);
    });
  }, [tasks, selectedDate, filterCategory, filterValue, starFilter, taskSearch, managerEmployeeId]);

  // Filter one-time tasks (selected date, not completed) and sort by time
  const oneTimeTasks = useMemo(() => {
    const searchTerm = taskSearch.trim().toLowerCase();
    const isTodaySearch = isSameDay(selectedDate, new Date()) && searchTerm.length > 0;

    let filtered = tasks.filter((t) => {
      if (isRecurringTask(t)) return false;

      // Manager filter (one-time): keep all one-time tasks visible on My Day,
      // even after assigning them to another employee, so manager can send/follow/approve.
      if (filterCategory === 'manager' && managerEmployeeId) {
        // Intentionally no employee_id exclusion here.
      }

      if (t.status === 'completed') return false;

      if (isTodaySearch) {
        const taskDate = startOfDay(new Date(t.start_date));
        const today = startOfDay(new Date());
        if (isBefore(taskDate, today)) return false;

        const haystack = `${t.title || ''} ${t.description || ''}`.toLowerCase();
        return haystack.includes(searchTerm);
      }

      return shouldTaskAppearOnDate(t, selectedDate);
    });

    // Apply star filter
    if (starFilter) {
      // Show only starred tasks, exclude completed
      filtered = filtered.filter((t) => t.is_starred === 1 && t.status !== 'completed');
    }

    // Apply employee filter (same logic as recurring tasks)
    if (filterCategory === 'employee' && filterValue) {
      if (filterValue === 'general') {
        filtered = filtered.filter((t) => !t.employee_id);
      } else {
        filtered = filtered.filter((t) => t.employee_id === parseInt(filterValue));
      }
    }

    return filtered.sort((a, b) => {
      // Sort by date first, then by start_time
      const dateCompare = new Date(a.start_date) - new Date(b.start_date);
      if (dateCompare !== 0) return dateCompare;

      const timeA = a.start_time || '00:00';
      const timeB = b.start_time || '00:00';
      return timeA.localeCompare(timeB);
    });
  }, [tasks, selectedDate, filterCategory, filterValue, starFilter, taskSearch, managerEmployeeId]);

  // Filter late tasks (is_late = true, not completed) and sort by date and time
  const lateTasks = useMemo(() => {
    let filtered = tasks.filter(
      (t) =>
        t.is_late === true &&
        !isTaskClosed(t)
    );

    // Apply star filter
    if (starFilter) {
      filtered = filtered.filter((t) => t.is_starred === 1);
    }

    return filtered.sort((a, b) => {
      // Sort by date first, then by time
      const dateCompare = new Date(a.start_date) - new Date(b.start_date);
      if (dateCompare !== 0) return dateCompare;

      const timeA = a.start_time || '00:00';
      const timeB = b.start_time || '00:00';
      return timeA.localeCompare(timeB);
    });
  }, [tasks, starFilter]);

  // Calculate tomorrow's tasks count (for any selected date)
  const tomorrowTasksCount = useMemo(() => {
    const tomorrow = addDays(selectedDate, 1);
    let filtered = tasks.filter(
      (t) =>
        shouldTaskAppearOnDate(t, tomorrow) &&
        !isTaskClosed(t)
    );
    // Apply star filter
    if (starFilter) {
      filtered = filtered.filter((t) => t.is_starred === 1);
    }
    return filtered.length;
  }, [tasks, selectedDate, starFilter]);

  // Count late tasks
  const lateTasksCount = useMemo(() => {
    return lateTasks.length;
  }, [lateTasks]);

  // Calculate timeline data from today (7/30 day planning view)
  const timelineData = useMemo(() => {
    const startDate = startOfDay(new Date());
    const timeline = [];

    for (let i = 0; i < timelineRangeDays; i++) {
      const currentDate = addDays(startDate, i);
      let tasksForDay = tasks.filter((task) =>
        shouldTaskAppearOnDate(task, currentDate) &&
        !isTaskClosed(task)
      );
      // Apply star filter
      if (starFilter) {
        tasksForDay = tasksForDay.filter((t) => t.is_starred === 1);
      }

      const isTodayDate = isSameDay(currentDate, new Date());
      const urgentCount = tasksForDay.filter((t) => t.priority === 'urgent').length;
      const normalCount = tasksForDay.filter((t) => t.priority === 'normal').length;
      const optionalCount = tasksForDay.filter((t) => t.priority === 'optional').length;

      // Keep forecast's "today" anchored to the real current day (not selectedDate)
      const dayCount = isTodayDate ? todayOpenStats.total : tasksForDay.length;
      const dayPriority = isTodayDate
        ? {
            urgent: todayOpenStats.byPriority.urgent,
            normal: todayOpenStats.byPriority.normal,
            optional: todayOpenStats.byPriority.optional
          }
        : {
            urgent: urgentCount,
            normal: normalCount,
            optional: optionalCount
          };

      timeline.push({
        date: currentDate,
        dateLabel: format(currentDate, 'dd/MM', { locale: he }),
        dayLabel: format(currentDate, 'EEE', { locale: he }),
        count: dayCount,
        byPriority: dayPriority,
        isToday: isTodayDate
      });
    }

    const maxCount = Math.max(...timeline.map(d => d.count), 1);

    return { timeline, maxCount };
  }, [tasks, starFilter, timelineRangeDays, todayOpenStats]);

  return (
    <div className="p-4 sm:p-6 overflow-x-hidden max-w-full">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold">היום שלי</h1>
          {tomorrowTasksCount > 0 && (
            <span className="text-xs sm:text-sm font-semibold text-blue-600 bg-blue-50 px-2 sm:px-3 py-1 rounded-lg">
              משימות למחר: {tomorrowTasksCount}
            </span>
          )}
          {lateTasksCount > 0 && (
            <span className="text-xs sm:text-sm font-semibold text-red-600 bg-red-50 px-2 sm:px-3 py-1 rounded-lg">
              משימות באיחור: {lateTasksCount}
            </span>
          )}
        </div>
        <p className="text-gray-600 mt-1 text-sm sm:text-base">
          {format(selectedDate, 'EEEE, dd/MM/yyyy', { locale: he })}
        </p>
      </div>

      {/* Stats Bar */}
      {/* Stats Bar */}
      <div className="flex items-center justify-end mb-2">
        <button
          onClick={() => setShowAdvancedStats((v) => !v)}
          className="text-xs text-gray-600 hover:text-indigo-600 underline"
        >
          {showAdvancedStats ? 'הסתר נתונים מתקדמים' : 'הצג נתונים מתקדמים'}
        </button>
      </div>      <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6 ${showAdvancedStats ? 'lg:grid-cols-5' : 'lg:grid-cols-3'}`}>
        {/* 1. Total tasks for today */}
        <div className="bg-blue-50 border-r-4 border-blue-500 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <FaCalendarDay className="text-3xl text-blue-500" />
            <div>
              <div className="text-3xl font-bold text-blue-700">{stats.total}</div>
              <div className="text-sm text-blue-600">משימות להיום</div>
            </div>
          </div>
        </div>

        {/* 2. Tasks by priority - Donut Chart */}
        <div className="bg-purple-50 border-r-4 border-purple-500 rounded-lg p-4">
          <div className="text-sm font-bold text-purple-700 mb-2 text-center">לפי עדיפות</div>
          {(() => {
            const items = [
              { label: 'דחוף', value: stats.byPriority.urgent, color: '#EF4444' },
              { label: 'רגיל', value: stats.byPriority.normal, color: '#3B82F6' },
              { label: 'נמוכה', value: stats.byPriority.optional, color: '#22C55E' },
            ].filter(i => i.value > 0);
            const total = items.reduce((s, i) => s + i.value, 0);
            const R = 40, C = 2 * Math.PI * R;
            let offset = 0;
            return (
              <div className="flex items-center justify-center gap-3">
                <div className="relative w-[100px] h-[100px]">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    {total === 0 ? (
                      <circle cx="50" cy="50" r={R} fill="none" stroke="#E5E7EB" strokeWidth="12" />
                    ) : items.map((item, i) => {
                      const dash = (item.value / total) * C;
                      const el = <circle key={i} cx="50" cy="50" r={R} fill="none" stroke={item.color} strokeWidth="12" strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={-offset} strokeLinecap="round" className="transition-all duration-700" />;
                      offset += dash;
                      return el;
                    })}
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-purple-700">{total}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  {items.map((item, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-gray-600">{item.label}</span>
                      <span className="font-bold text-gray-800">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        {showAdvancedStats && (
        <>
        {/* 3. Tasks by system - Donut Chart */}
        <div className="bg-orange-50 border-r-4 border-orange-500 rounded-lg p-4">
          <div className="text-sm font-bold text-orange-700 mb-2 text-center">לפי מערכת</div>
          {(() => {
            const systemColors = ['#F97316', '#FB923C', '#FDBA74', '#C2410C', '#EA580C', '#FED7AA'];
            const items = [
              ...systems.map((s, i) => ({ label: s.name, value: stats.bySystem[s.id] || 0, color: systemColors[i % systemColors.length] })),
            ].filter(i => i.value > 0);
            const total = items.reduce((s, i) => s + i.value, 0);
            const R = 40, C = 2 * Math.PI * R;
            let offset = 0;
            return (
              <div className="flex items-center justify-center gap-3">
                <div className="relative w-[100px] h-[100px]">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    {total === 0 ? (
                      <circle cx="50" cy="50" r={R} fill="none" stroke="#E5E7EB" strokeWidth="12" />
                    ) : items.map((item, i) => {
                      const dash = (item.value / total) * C;
                      const el = <circle key={i} cx="50" cy="50" r={R} fill="none" stroke={item.color} strokeWidth="12" strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={-offset} strokeLinecap="round" className="transition-all duration-700" />;
                      offset += dash;
                      return el;
                    })}
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-orange-700">{total}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  {items.map((item, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-gray-600 truncate max-w-[60px]" title={item.label}>{item.label}</span>
                      <span className="font-bold text-gray-800">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
        </>
        )}

        {/* 4. Tasks by status - Donut Chart */}
        <div className="bg-green-50 border-r-4 border-green-500 rounded-lg p-4">
          <div className="text-sm font-bold text-green-700 mb-2 text-center">לפי סטטוס</div>
          {(() => {
            const items = [
              { label: 'חדש', value: stats.byStatus.new, color: '#6B7280' },
              { label: 'נשלח', value: stats.byStatus.sent, color: '#3B82F6' },
              { label: 'בביצוע', value: stats.byStatus.inProgress, color: '#EAB308' },
              { label: 'הושלם', value: stats.byStatus.completed, color: '#22C55E' },
            ].filter(i => i.value > 0);
            const total = items.reduce((s, i) => s + i.value, 0);
            const R = 40, C = 2 * Math.PI * R;
            let offset = 0;
            return (
              <div className="flex items-center justify-center gap-3">
                <div className="relative w-[100px] h-[100px]">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    {total === 0 ? (
                      <circle cx="50" cy="50" r={R} fill="none" stroke="#E5E7EB" strokeWidth="12" />
                    ) : items.map((item, i) => {
                      const dash = (item.value / total) * C;
                      const el = <circle key={i} cx="50" cy="50" r={R} fill="none" stroke={item.color} strokeWidth="12" strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={-offset} strokeLinecap="round" className="transition-all duration-700" />;
                      offset += dash;
                      return el;
                    })}
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-green-700">{total}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  {items.map((item, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-gray-600">{item.label}</span>
                      <span className="font-bold text-gray-800">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        {showAdvancedStats && (
        <>
        {/* 5. Recurring vs One-time - Donut Chart */}
        <div className="bg-teal-50 border-r-4 border-teal-500 rounded-lg p-4">
          <div className="text-sm font-bold text-teal-700 mb-2 text-center">סוג משימה</div>
          {(() => {
            const items = [
              { label: 'קבועות', value: stats.recurringTasks, color: '#14B8A6' },
              { label: 'חד פעמיות', value: stats.oneTimeTasks, color: '#60A5FA' },
            ].filter(i => i.value > 0);
            const total = items.reduce((s, i) => s + i.value, 0);
            const R = 40, C = 2 * Math.PI * R;
            let offset = 0;
            return (
              <div className="flex items-center justify-center gap-3">
                <div className="relative w-[100px] h-[100px]">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    {total === 0 ? (
                      <circle cx="50" cy="50" r={R} fill="none" stroke="#E5E7EB" strokeWidth="12" />
                    ) : items.map((item, i) => {
                      const dash = (item.value / total) * C;
                      const el = <circle key={i} cx="50" cy="50" r={R} fill="none" stroke={item.color} strokeWidth="12" strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={-offset} strokeLinecap="round" className="transition-all duration-700" />;
                      offset += dash;
                      return el;
                    })}
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-teal-700">{total}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  {items.map((item, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-gray-600">{item.label}</span>
                      <span className="font-bold text-gray-800">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
        </>
        )}
      </div>

      {stats.total === 0 && stats.completed === 0 && (
        <div className="bg-white rounded-lg shadow-md p-8 mb-6 text-center">
          <h3 className="text-xl font-bold mb-2">אין משימות ליום שנבחר</h3>
          <p className="text-gray-600 mb-4">נתחיל בקטן: צור משימה ראשונה או טען נתוני דמה לפיתוח.</p>
          <button
            onClick={() => setIsTaskModalOpen(true)}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-orange-600"
          >
            צור משימה ראשונה
          </button>
        </div>
      )}

      {/* Timeline Chart */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6 overflow-hidden">
        <div className="flex items-center justify-between mb-3 gap-3">
          <div>
            <h3 className="text-lg font-semibold">תחזית עומס משימות</h3>
            <p className="text-xs text-gray-500">תמיד מחושב מהיום קדימה</p>
          </div>
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setTimelineRangeDays(7)}
              className={`px-3 py-1.5 text-xs rounded ${timelineRangeDays === 7 ? 'bg-white shadow text-gray-900' : 'text-gray-600'}`}
            >
              שבוע
            </button>
            <button
              onClick={() => setTimelineRangeDays(30)}
              className={`px-3 py-1.5 text-xs rounded ${timelineRangeDays === 30 ? 'bg-white shadow text-gray-900' : 'text-gray-600'}`}
            >
              חודש
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-2 text-xs text-gray-600">
          <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>דחוף</span>
          <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>רגיל</span>
          <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>נמוך</span>
        </div>

        <div className="overflow-x-auto -mx-4 px-4">
          <div className={`flex items-end justify-between ${timelineRangeDays === 30 ? 'gap-1 min-w-[1200px]' : 'gap-1 sm:gap-2 min-w-[600px]'} h-40 pt-4`}>
            {timelineData.timeline.map((day, index) => {
              const barHeight = (day.count / timelineData.maxCount) * 100;
              return (
                <div
                  key={index}
                  title={`${day.dateLabel} · ${day.count} משימות — לחץ לניווט`}
                  className={`flex-1 flex flex-col items-center gap-1 sm:gap-2 min-w-[32px] sm:min-w-[44px] cursor-pointer rounded-lg transition-all duration-150 hover:bg-blue-50 px-0.5 ${
                    isSameDay(day.date, selectedDate) && !day.isToday ? 'ring-2 ring-blue-400 ring-offset-1 bg-blue-50/60' : ''
                  }`}
                  onClick={() => setSelectedDate(day.date)}
                >
                {/* Count — above bar */}
                <div className={`text-xs font-bold h-5 flex items-center justify-center ${
                  day.isToday ? 'text-blue-700' : 'text-gray-700'
                }`}>
                  {day.count > 0 ? day.count : ''}
                </div>
                {/* Bar */}
                <div className="w-full flex flex-col justify-end h-28">
                  <div
                    className={`w-full transition-all duration-300 rounded-t-md overflow-hidden ${day.count > 0 ? 'shadow-sm' : ''}`}
                    style={{ height: `${barHeight}%` }}
                  >
                    {day.count > 0 ? (
                      <div className="w-full h-full flex flex-col-reverse">
                        {day.byPriority.optional > 0 && (
                          <div
                            className="w-full bg-emerald-500"
                            style={{ height: `${(day.byPriority.optional / day.count) * 100}%` }}
                          />
                        )}
                        {day.byPriority.normal > 0 && (
                          <div
                            className="w-full bg-blue-500"
                            style={{ height: `${(day.byPriority.normal / day.count) * 100}%` }}
                          />
                        )}
                        {day.byPriority.urgent > 0 && (
                          <div
                            className="w-full bg-red-500"
                            style={{ height: `${(day.byPriority.urgent / day.count) * 100}%` }}
                          />
                        )}
                      </div>
                    ) : (
                      <div className="w-full h-full bg-gray-200" />
                    )}
                  </div>
                </div>
                {/* Date (fixed height to keep monthly bars perfectly aligned) */}
                {(() => {
                  const showLabel = timelineRangeDays === 7 || index % 2 === 0 || day.isToday;
                  return (
                    <div className="text-center h-9 flex flex-col justify-start">
                      <div
                        className={`text-xs font-semibold ${
                          day.isToday ? 'text-blue-600' : 'text-gray-600'
                        } ${showLabel ? '' : 'opacity-0'}`}
                      >
                        {day.dayLabel}
                      </div>
                      <div
                        className={`text-xs ${
                          day.isToday ? 'text-blue-500' : 'text-gray-500'
                        } ${showLabel ? '' : 'opacity-0'}`}
                      >
                        {day.dateLabel}
                      </div>
                    </div>
                  );
                })()}
              </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Progress Bar - show only when selectedDate is today */}
      {isSelectedDateToday && (
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">התקדמות משימות היום</h3>
            <span className="text-sm text-gray-600">
              {stats.completed} מתוך {stats.total} הושלמו
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className="bg-green-500 h-4 rounded-full transition-all duration-300"
              style={{ width: `${stats.completionRate}%` }}
            />
          </div>
          <p className="text-center text-2xl font-bold text-green-600 mt-2">
            {stats.completionRate}%
          </p>
        </div>
      )}

      {/* Data management buttons (non-production only) */}
      {SHOW_DATA_CONTROLS && (
        <div className="flex gap-2 mb-3">
          <button
            onClick={async () => {
              if (confirm('פעולה זו תמחק את כל הנתונים הקיימים ותטען נתוני דמה. להמשיך?')) {
                try {
                  await seedData();
                  alert('נתוני דמה נטענו בהצלחה!');
                } catch (error) {
                  alert('שגיאה: ' + error.message);
                }
              }
            }}
            className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium py-1.5 px-3 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <FaDatabase size={12} />
            טען נתוני דמה
          </button>
          <button
            onClick={async () => {
              if (confirm('אזהרה! פעולה זו תמחק את כל הנתונים. האם אתה בטוח?')) {
                try {
                  await clearData();
                  alert('כל הנתונים נמחקו בהצלחה');
                } catch (error) {
                  alert('שגיאה: ' + error.message);
                }
              }
            }}
            className="bg-red-500 hover:bg-red-600 text-white text-sm font-medium py-1.5 px-3 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <FaTrash size={12} />
            נקה נתונים
          </button>
        </div>
      )}

      {/* Column width reset button - Desktop only */}
      {!(filterCategory === 'employee' && filterValue) && (
        <div className="hidden lg:flex justify-start mb-3">
          <button
            onClick={handleResetColumnWidths}
            className="text-sm text-gray-600 hover:text-indigo-600 underline"
          >
            איפוס גודל עמודות
          </button>
        </div>
      )}

      {isSelectedDateToday && (
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <input
            type="text"
            value={taskSearch}
            onChange={(e) => setTaskSearch(e.target.value)}
            placeholder="חיפוש משימות..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[44px]"
          />
        </div>
      )}

      {/* Main Content - Dynamic Layout */}
      {filterCategory === 'employee' && filterValue ? (
        /* Unified view when filtering by employee */
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">
              כל המשימות ({recurringTasks.length + oneTimeTasks.length})
            </h2>
            <button
              onClick={handleSendAllTasks}
              disabled={isSendingBulk}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 min-h-[44px] transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaPaperPlane />
              <span>{isSendingBulk ? 'שולח...' : 'שלח כל המשימות'}</span>
            </button>
          </div>

          {/* Filters */}
          <div className="mb-4 flex gap-3">
            {/* Primary filter - Category selection */}
            <select
              value={filterCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 min-h-[44px]"
            >
              <option value="manager">משימות מנהל</option>
              <option value="">כל המשימות</option>
              <option value="priority">סנן לפי עדיפות</option>
              <option value="system">סנן לפי מערכת</option>
              <option value="status">סנן לפי סטטוס</option>
              <option value="employee">סנן לפי עובד</option>
              <option value="location">סנן לפי מיקום</option>
            </select>

            {/* Secondary filter - Value selection based on category */}
            {filterCategory && filterCategory !== 'manager' && (
              <select
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 min-h-[44px]"
              >
                <option value="">בחר...</option>

                {filterCategory === 'priority' && (
                  <>
                    <option value="urgent">דחוף</option>
                    <option value="normal">רגיל</option>
                    <option value="optional">עדיפות נמוכה</option>
                  </>
                )}

                {filterCategory === 'system' &&
                  systems.map((system) => (
                    <option key={system.id} value={system.id}>
                      {system.name}
                    </option>
                  ))
                }

                {filterCategory === 'status' && (
                  <>
                    <option value="draft">חדש</option>
                    <option value="sent">נשלח</option>
                    <option value="in_progress">בביצוע</option>
                    <option value="not_completed">לא בוצע</option>
                  </>
                )}

                {filterCategory === 'employee' && (
                  <>
                    <option value="general">כללי (ללא עובד)</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name}
                      </option>
                    ))}
                  </>
                )}

                {filterCategory === 'location' && (
                  <>
                    <option value="none">ללא מיקום</option>
                    {locations && locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </>
                )}
              </select>
            )}

            {/* Clear filters button */}
            {filterCategory && (
              <button
                onClick={() => {
                  setFilterCategory('');
                  setFilterValue('');
                }}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 underline"
              >
                נקה סינון
              </button>
            )}
          </div>

          {/* Unified task list - all tasks sorted by time */}
          <div className="space-y-0 bg-white rounded-lg shadow-sm">
            {[...recurringTasks, ...oneTimeTasks]
              .sort((a, b) => {
                const timeA = a.start_time || '00:00';
                const timeB = b.start_time || '00:00';
                return timeA.localeCompare(timeB);
              })
              .map((task) => (
                renderTaskCard(task)
              ))
            }
            {recurringTasks.length === 0 && oneTimeTasks.length === 0 && (
              <p className="text-gray-500 text-center py-8">אין משימות להצגה</p>
            )}
          </div>
        </div>
      ) : (
        /* Split layout when not filtering by employee */
        <>
          {/* Desktop: Resizable columns (>= 1024px) */}
          <div className="hidden lg:flex gap-0 relative w-full">
            {/* Recurring Tasks (All Systems) - RIGHT SIDE - Resizable */}
            <Resizable
              size={{ width: columnWidths.left, height: 'auto' }}
              onResizeStop={(e, direction, ref, d) => {
                const container = ref.parentElement;
                const containerWidth = container.offsetWidth;
                const newLeftWidth = ref.offsetWidth;

                // Enforce min-width: 250px for left column
                if (newLeftWidth < 250) return;

                // Enforce max-width: 70% for left column (ensures right column gets at least 30%)
                const leftPercent = (newLeftWidth / containerWidth) * 100;
                if (leftPercent > 70) return;

                // Only store the left column width - right column will use flex: 1
                setColumnWidths({
                  left: `${newLeftWidth}px`,
                  right: 'auto'
                });
              }}
              minWidth={250}
              maxWidth="70%"
              enable={{
                top: false,
                right: false,
                bottom: false,
                left: true,
                topRight: false,
                bottomRight: false,
                bottomLeft: false,
                topLeft: false
              }}
              handleStyles={{
                left: {
                  width: '12px',
                  left: '0px',
                  cursor: 'col-resize',
                  zIndex: 30,
                  backgroundColor: '#9ca3af',
                  borderRadius: '8px 0 0 8px',
                  transition: 'background-color 0.2s'
                }
              }}
              handleClasses={{
                left: 'hover:!bg-indigo-500'
              }}
            >
              <div className="bg-white rounded-lg shadow-md p-4 h-full">
                <div className="flex items-start justify-between mb-4 gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedDate(new Date())}
                      className="bg-white border border-gray-300 px-3 h-[40px] rounded-lg hover:bg-gray-50 text-sm"
                    >
                      היום
                    </button>
                    <h2 className="text-xl font-bold">
                      משימות קבועות ({recurringTasks.length})
                    </h2>
                  </div>
                  <div className="flex items-start gap-3">
                    <DatePicker
                      selected={selectedDate}
                      onChange={(date) => setSelectedDate(date)}
                      dateFormat="dd/MM/yyyy"
                      className="border border-gray-300 px-4 h-[40px] rounded-lg w-36 text-sm"
                      minDate={today}
                      popperPlacement="bottom-start"
                      popperModifiers={[
                        { name: 'flip', enabled: false }
                      ]}
                    />
                    <button
                      onClick={handleSendAllTasks}
                      disabled={isSendingBulk}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 h-[40px] rounded-lg flex items-center gap-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FaPaperPlane />
                      <span>{isSendingBulk ? 'שולח...' : 'שלח כל המשימות'}</span>
                    </button>
                  </div>
                </div>

                {/* Filters */}
                <div className="mb-4 flex gap-3">
                  {/* Primary filter - Category selection */}
                  <select
                    value={filterCategory}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 min-h-[44px]"
                  >
                    <option value="manager">משימות מנהל</option>
              <option value="">כל המשימות</option>
                    <option value="priority">סנן לפי עדיפות</option>
                    <option value="system">סנן לפי מערכת</option>
                    <option value="status">סנן לפי סטטוס</option>
                    <option value="employee">סנן לפי עובד</option>
                    <option value="location">סנן לפי מיקום</option>
                  </select>

                  {/* Secondary filter - Value selection based on category */}
                  {filterCategory && filterCategory !== 'manager' && (
                    <select
                      value={filterValue}
                      onChange={(e) => setFilterValue(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 min-h-[44px]"
                    >
                      <option value="">בחר...</option>

                      {filterCategory === 'priority' && (
                        <>
                          <option value="urgent">דחוף</option>
                          <option value="normal">רגיל</option>
                          <option value="optional">עדיפות נמוכה</option>
                        </>
                      )}

                      {filterCategory === 'system' &&
                        systems.map((system) => (
                          <option key={system.id} value={system.id}>
                            {system.name}
                          </option>
                        ))
                      }

                      {filterCategory === 'status' && (
                        <>
                          <option value="draft">חדש</option>
                          <option value="sent">נשלח</option>
                          <option value="in_progress">בביצוע</option>
                          <option value="not_completed">לא בוצע</option>
                        </>
                      )}

                      {filterCategory === 'employee' && (
                        <>
                          <option value="general">כללי (ללא עובד)</option>
                          {employees.map((emp) => (
                            <option key={emp.id} value={emp.id}>
                              {emp.name}
                            </option>
                          ))}
                        </>
                      )}

                      {filterCategory === 'location' && (
                        <>
                          <option value="none">ללא מיקום</option>
                          {locations && locations.map((loc) => (
                            <option key={loc.id} value={loc.id}>
                              {loc.name}
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                  )}

                  {/* Clear filters button */}
                  {filterCategory && (
                    <button
                      onClick={() => {
                        setFilterCategory('');
                        setFilterValue('');
                      }}
                      className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 underline"
                    >
                      נקה סינון
                    </button>
                  )}
                </div>

                <div className="space-y-0">
                  {recurringTasks.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">אין משימות קבועות להיום</p>
                  ) : (
                    recurringTasks.map((task) => (
                      renderTaskCard(task)
                    ))
                  )}
                </div>
              </div>
            </Resizable>

            {/* One-Time and Late Tasks - LEFT SIDE - Flex to fill remaining space */}
            <div className="relative flex-1 min-w-[250px]">
              <div className="bg-white rounded-lg shadow-md p-4">
                <h2 className="text-xl font-bold mb-4">משימות חד פעמיות ({oneTimeTasks.length})</h2>

                <div className="space-y-0">
                  {oneTimeTasks.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">אין משימות חד פעמיות להיום</p>
                  ) : (
                    oneTimeTasks.map((task) => (
                      renderTaskCard(task)
                    ))
                  )}
                </div>

                {isSelectedDateToday && !isTaskSearchActive && lateTasks.length > 0 && (
                  <>
                    <div className="my-4 border-t border-gray-300" />
                    <h3 className="text-lg font-semibold text-red-600 mb-3">
                      משימות באיחור
                    </h3>
                    <div className="space-y-0">
                      {lateTasks.map((task) => (
                        renderTaskCard(task)
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Mobile: Stack vertically (< 1024px) */}
          <div className="lg:hidden grid grid-cols-1 gap-6">
            {/* Recurring Tasks */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="flex items-start justify-between mb-4 gap-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">
                    משימות קבועות ({recurringTasks.length})
                  </h2>
                  <button
                    onClick={() => setSelectedDate(new Date())}
                    className="bg-white border border-gray-300 px-3 h-[40px] rounded-lg hover:bg-gray-50 text-sm"
                  >
                    היום
                  </button>
                </div>
                <div className="flex items-start gap-2">
                  <DatePicker
                    selected={selectedDate}
                    onChange={(date) => setSelectedDate(date)}
                    dateFormat="dd/MM/yyyy"
                    className="border border-gray-300 px-4 h-[40px] rounded-lg w-32 text-sm"
                    minDate={today}
                    popperPlacement="bottom-start"
                    popperModifiers={[
                      { name: 'flip', enabled: false }
                    ]}
                  />
                  <button
                    onClick={handleSendAllTasks}
                    disabled={isSendingBulk}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 h-[40px] rounded-lg flex items-center gap-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FaPaperPlane />
                    <span>{isSendingBulk ? 'שולח...' : 'שלח כל המשימות'}</span>
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="mb-4 flex gap-3">
                {/* Primary filter - Category selection */}
                <select
                  value={filterCategory}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 min-h-[44px]"
                >
                  <option value="manager">משימות מנהל</option>
              <option value="">כל המשימות</option>
                  <option value="priority">סנן לפי עדיפות</option>
                  <option value="system">סנן לפי מערכת</option>
                  <option value="status">סנן לפי סטטוס</option>
                  <option value="employee">סנן לפי עובד</option>
                  <option value="location">סנן לפי מיקום</option>
                </select>

                {/* Secondary filter - Value selection based on category */}
                {filterCategory && filterCategory !== 'manager' && (
                  <select
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 min-h-[44px]"
                  >
                    <option value="">בחר...</option>

                    {filterCategory === 'priority' && (
                      <>
                        <option value="urgent">דחוף</option>
                        <option value="normal">רגיל</option>
                        <option value="optional">עדיפות נמוכה</option>
                      </>
                    )}

                    {filterCategory === 'system' &&
                      systems.map((system) => (
                        <option key={system.id} value={system.id}>
                          {system.name}
                        </option>
                      ))
                    }

                    {filterCategory === 'status' && (
                      <>
                        <option value="draft">חדש</option>
                        <option value="sent">נשלח</option>
                        <option value="in_progress">בביצוע</option>
                        <option value="not_completed">לא בוצע</option>
                      </>
                    )}

                    {filterCategory === 'employee' && (
                      <>
                        <option value="general">כללי (ללא עובד)</option>
                        {employees.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name}
                          </option>
                        ))}
                      </>
                    )}

                    {filterCategory === 'location' && (
                      <>
                        <option value="none">ללא מיקום</option>
                        {locations && locations.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                )}

                {/* Clear filters button */}
                {filterCategory && (
                  <button
                    onClick={() => {
                      setFilterCategory('');
                      setFilterValue('');
                    }}
                    className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 underline"
                  >
                    נקה סינון
                  </button>
                )}
              </div>

              <div className="space-y-0">
                {recurringTasks.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">אין משימות קבועות להיום</p>
                ) : (
                  recurringTasks.map((task) => (
                    renderTaskCard(task)
                  ))
                )}
              </div>
            </div>

            {/* One-Time and Late Tasks */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <h2 className="text-xl font-bold mb-4">משימות חד פעמיות ({oneTimeTasks.length})</h2>

              <div className="space-y-0">
                {oneTimeTasks.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">אין משימות חד פעמיות להיום</p>
                ) : (
                  oneTimeTasks.map((task) => (
                    renderTaskCard(task)
                  ))
                )}
              </div>

              {isSelectedDateToday && !isTaskSearchActive && lateTasks.length > 0 && (
                <>
                  <div className="my-4 border-t border-gray-300" />
                  <h3 className="text-lg font-semibold text-red-600 mb-3">
                    משימות באיחור
                  </h3>
                  <div className="space-y-0">
                    {lateTasks.map((task) => (
                      renderTaskCard(task)
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* Pending approval — below all task lists */}
      {pendingApprovalTasks.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mt-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-orange-600 font-bold text-sm">⏳ ממתינות לאישור ({pendingApprovalTasks.length})</span>
          </div>
          <div className="space-y-2">
            {pendingApprovalTasks.map(task => (
              <div key={task.id} className="flex items-center gap-3 bg-white rounded-lg px-3 py-2 shadow-sm">
                <button
                  onClick={() => handleApproveTask(task.id)}
                  className="text-xs bg-green-500 text-white px-3 py-1.5 rounded-lg hover:bg-green-600 transition-colors font-medium flex-shrink-0"
                >
                  ✓ אשר
                </button>
                <div className="text-right">
                  <div className="text-sm font-semibold">{task.title}</div>
                  <div className="text-xs text-gray-500">{task.employee_name} · {task.start_time ? task.start_time.slice(0,5) : 'ללא שעה'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

