import { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { format, isBefore, startOfDay, addDays, isSameDay } from 'date-fns';
import { he } from 'date-fns/locale';
import { FaCalendarDay, FaPaperPlane } from 'react-icons/fa';
import TaskCard from '../components/shared/TaskCard';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import '../components/forms/datepicker-custom.css';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function MyDayPage() {
  const { tasks, systems, employees, setIsTaskModalOpen, setEditingTask, updateTaskStatus } = useApp();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const today = startOfDay(new Date());
  const [isSendingBulk, setIsSendingBulk] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Filter states
  const [filterCategory, setFilterCategory] = useState(''); // '' | 'priority' | 'system' | 'status' | 'employee'
  const [filterValue, setFilterValue] = useState(''); // The specific value within the selected category

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

  // Handle filter category change (reset value when category changes)
  const handleCategoryChange = (category) => {
    setFilterCategory(category);
    setFilterValue(''); // Reset value when category changes
  };

  // Handle bulk send all tasks
  const handleSendAllTasks = async () => {
    // Get current time
    const now = new Date();
    const currentTime = format(now, 'HH:mm');

    // Filter tasks to send (not sent yet, and time hasn't passed)
    let tasksToSend = recurringTasks.filter(task => {
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

    // Apply employee filter if active
    if (filterCategory === 'employee' && filterValue) {
      if (filterValue === 'general') {
        tasksToSend = tasksToSend.filter(t => !t.employee_id);
      } else {
        tasksToSend = tasksToSend.filter(t => t.employee_id === parseInt(filterValue));
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
          date: format(new Date(task.start_date), 'dd/MM/yyyy')
        };
      }

      tasksByEmployee[task.employee_id].tasks.push({
        id: task.id,
        title: task.title,
        description: task.description,
        start_time: task.start_time,
        system_name: task.system_name,
        estimated_duration_minutes: task.estimated_duration_minutes,
        status: task.status
      });
    });

    const employeeCount = Object.keys(tasksByEmployee).length;
    const confirmMessage = filterCategory === 'employee' && filterValue
      ? `האם לשלוח ${tasksToSend.length} משימות ל-${tasksByEmployee[Object.keys(tasksByEmployee)[0]]?.name}?`
      : `האם לשלוח ${tasksToSend.length} משימות ל-${employeeCount} עובדים?`;

    if (!confirm(confirmMessage)) return;

    setIsSendingBulk(true);

    try {
      const response = await axios.post(`${API_URL}/api/whatsapp/send-bulk`, {
        tasksByEmployee
      });

      // Update all tasks status to 'sent'
      const taskIds = tasksToSend.map(t => t.id);
      for (const taskId of taskIds) {
        await updateTaskStatus(taskId, 'sent');
      }

      alert(response.data.message);
    } catch (error) {
      alert('שגיאה: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsSendingBulk(false);
    }
  };

  // Helper function to check if a task should appear on the selected date
  const shouldTaskAppearOnDate = (task, date) => {
    // One-time tasks: check exact date match
    if (!task.is_recurring) {
      return isSameDay(new Date(task.start_date), date);
    }

    // Recurring tasks: check if they apply to this day
    const taskStartDate = new Date(task.start_date);

    // Task hasn't started yet
    if (date < taskStartDate) {
      return false;
    }

    // Daily tasks: appear every day after start date
    if (task.frequency === 'daily') {
      return true;
    }

    // Weekly tasks: check weekly_days
    if (task.frequency === 'weekly' && task.weekly_days) {
      try {
        const weeklyDays = JSON.parse(task.weekly_days);
        const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        return weeklyDays.includes(dayNames[dayOfWeek]);
      } catch (e) {
        console.error('Error parsing weekly_days:', e);
        return false;
      }
    }

    // For other frequencies, just show on the exact date for now
    return isSameDay(taskStartDate, date);
  };

  // Calculate statistics and filter tasks
  const stats = useMemo(() => {
    // Filter tasks for selected date (excluding completed tasks)
    const todayTasks = tasks.filter((t) =>
      shouldTaskAppearOnDate(t, selectedDate) &&
      t.status !== 'completed'
    );

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
    const recurringTasksCount = todayTasks.filter((t) => t.is_recurring === 1).length;
    const oneTimeTasksCount = todayTasks.filter((t) => t.is_recurring === 0).length;

    // 4. Tasks by status (today only, excluding completed)
    const newTasks = todayTasks.filter((t) => t.status === 'draft').length;
    const sentTasks = todayTasks.filter((t) => t.status === 'sent').length;
    const inProgressTasks = todayTasks.filter((t) => t.status === 'in_progress').length;

    // 5. Count completed tasks separately for completion rate
    const completedTasks = tasks.filter((t) =>
      shouldTaskAppearOnDate(t, selectedDate) &&
      t.status === 'completed'
    ).length;

    // Completion rate calculation (completed / (uncompleted + completed))
    const totalIncludingCompleted = totalToday + completedTasks;
    const completionRate =
      totalIncludingCompleted > 0 ? Math.round((completedTasks / totalIncludingCompleted) * 100) : 0;

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
        completed: completedTasks
      },
      completed: completedTasks,
      completionRate
    };
  }, [tasks, selectedDate]);

  // Filter recurring tasks (all systems including general, selected date, not completed) and sort by time
  const recurringTasks = useMemo(() => {
    let filtered = tasks.filter(
      (t) =>
        shouldTaskAppearOnDate(t, selectedDate) &&
        t.status !== 'completed' &&
        t.is_recurring === 1 // Recurring tasks only
    );

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
      }
    }

    return filtered.sort((a, b) => {
      // Sort by start_time chronologically
      const timeA = a.start_time || '00:00';
      const timeB = b.start_time || '00:00';
      return timeA.localeCompare(timeB);
    });
  }, [tasks, selectedDate, filterCategory, filterValue]);

  // Filter one-time tasks (selected date, not completed) and sort by time
  const oneTimeTasks = useMemo(() => {
    return tasks
      .filter(
        (t) =>
          shouldTaskAppearOnDate(t, selectedDate) &&
          t.status !== 'completed' &&
          t.is_recurring === 0 // One-time tasks only
      )
      .sort((a, b) => {
        // Sort by start_time chronologically
        const timeA = a.start_time || '00:00';
        const timeB = b.start_time || '00:00';
        return timeA.localeCompare(timeB);
      });
  }, [tasks, selectedDate]);

  // Filter late tasks (is_late = true, not completed) and sort by date and time
  const lateTasks = useMemo(() => {
    return tasks
      .filter(
        (t) =>
          t.is_late === true &&
          t.status !== 'completed'
      )
      .sort((a, b) => {
        // Sort by date first, then by time
        const dateCompare = new Date(a.start_date) - new Date(b.start_date);
        if (dateCompare !== 0) return dateCompare;

        const timeA = a.start_time || '00:00';
        const timeB = b.start_time || '00:00';
        return timeA.localeCompare(timeB);
      });
  }, [tasks]);

  // Calculate tomorrow's tasks count (for any selected date)
  const tomorrowTasksCount = useMemo(() => {
    const tomorrow = addDays(selectedDate, 1);
    return tasks.filter(
      (t) =>
        shouldTaskAppearOnDate(t, tomorrow) &&
        t.status !== 'completed'
    ).length;
  }, [tasks, selectedDate]);

  // Count late tasks
  const lateTasksCount = useMemo(() => {
    return lateTasks.length;
  }, [lateTasks]);

  // Calculate timeline data for the next 7 days from selected date
  const timelineData = useMemo(() => {
    const startDate = startOfDay(selectedDate);
    const timeline = [];

    for (let i = 0; i < 7; i++) {
      const currentDate = addDays(startDate, i);
      const tasksForDay = tasks.filter((task) =>
        shouldTaskAppearOnDate(task, currentDate) &&
        task.status !== 'completed'
      );

      timeline.push({
        date: currentDate,
        dateLabel: format(currentDate, 'dd/MM', { locale: he }),
        dayLabel: format(currentDate, 'EEE', { locale: he }),
        count: tasksForDay.length,
        isToday: isSameDay(currentDate, selectedDate)
      });
    }

    const maxCount = Math.max(...timeline.map(d => d.count), 1);

    return { timeline, maxCount };
  }, [tasks, selectedDate]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold">היום שלי</h1>
            {tomorrowTasksCount > 0 && (
              <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg">
                משימות למחר: {tomorrowTasksCount}
              </span>
            )}
            {lateTasksCount > 0 && (
              <span className="text-sm font-semibold text-red-600 bg-red-50 px-3 py-1 rounded-lg">
                משימות באיחור: {lateTasksCount}
              </span>
            )}
          </div>
          <p className="text-gray-600 mt-1">
            {format(selectedDate, 'EEEE, dd/MM/yyyy', { locale: he })}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setSelectedDate(new Date())}
            className="bg-white border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50"
          >
            היום
          </button>
          <button
            onClick={() => setSelectedDate(addDays(selectedDate, 1))}
            className="bg-white border border-gray-300 px-3 py-2 rounded-lg hover:bg-gray-50"
          >
            ←
          </button>
          <DatePicker
            selected={selectedDate}
            onChange={(date) => setSelectedDate(date)}
            dateFormat="dd/MM/yyyy"
            className="border border-gray-300 px-3 py-2 rounded-lg"
            minDate={today}
          />
          <button
            onClick={() => setSelectedDate(addDays(selectedDate, -1))}
            disabled={isSameDay(selectedDate, today)}
            className={`bg-white border border-gray-300 px-3 py-2 rounded-lg ${
              isSameDay(selectedDate, today)
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-gray-50'
            }`}
          >
            →
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-4 mb-6">
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

        {/* 2. Tasks by priority */}
        <div className="bg-purple-50 border-r-4 border-purple-500 rounded-lg p-4">
          <div className="text-lg font-bold text-purple-700 mb-3 text-center">לפי עדיפות</div>
          <div className="flex items-end justify-between gap-2 h-24">
            {/* Urgent */}
            {stats.byPriority.urgent > 0 && (
              <div className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col justify-end h-16">
                  <div
                    className="w-full bg-red-500 rounded-t-lg"
                    style={{
                      height: `${(stats.byPriority.urgent / Math.max(stats.byPriority.urgent, stats.byPriority.normal, stats.byPriority.optional, 1)) * 100}%`
                    }}
                  />
                </div>
                <div className="text-sm font-bold text-purple-700">{stats.byPriority.urgent}</div>
                <div className="text-xs text-purple-600">דחוף</div>
              </div>
            )}

            {/* Normal */}
            {stats.byPriority.normal > 0 && (
              <div className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col justify-end h-16">
                  <div
                    className="w-full bg-blue-500 rounded-t-lg"
                    style={{
                      height: `${(stats.byPriority.normal / Math.max(stats.byPriority.urgent, stats.byPriority.normal, stats.byPriority.optional, 1)) * 100}%`
                    }}
                  />
                </div>
                <div className="text-sm font-bold text-purple-700">{stats.byPriority.normal}</div>
                <div className="text-xs text-purple-600">רגיל</div>
              </div>
            )}

            {/* Optional */}
            {stats.byPriority.optional > 0 && (
              <div className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col justify-end h-16">
                  <div
                    className="w-full bg-green-500 rounded-t-lg"
                    style={{
                      height: `${(stats.byPriority.optional / Math.max(stats.byPriority.urgent, stats.byPriority.normal, stats.byPriority.optional, 1)) * 100}%`
                    }}
                  />
                </div>
                <div className="text-sm font-bold text-purple-700">{stats.byPriority.optional}</div>
                <div className="text-xs text-purple-600">נמוכה</div>
              </div>
            )}
          </div>
        </div>

        {/* 3. Tasks by system */}
        <div className="bg-orange-50 border-r-4 border-orange-500 rounded-lg p-4">
          <div className="text-lg font-bold text-orange-700 mb-3 text-center">לפי מערכת</div>
          <div className="flex items-end justify-between gap-1 h-24">
            {(() => {
              // Calculate maxCount once for all bars
              const maxCount = Math.max(
                ...systems.map(s => stats.bySystem[s.id] || 0),
                stats.recurringTasks,
                stats.oneTimeTasks,
                1
              );

              return (
                <>
                  {systems.map((system) => {
                    const count = stats.bySystem[system.id] || 0;
                    if (count === 0) return null;

                    return (
                      <div key={system.id} className="flex-1 flex flex-col items-center gap-1 min-w-[60px]">
                        <div className="w-full flex flex-col justify-end h-16">
                          <div
                            className="w-full bg-orange-500 rounded-t-lg"
                            style={{
                              height: `${(count / maxCount) * 100}%`
                            }}
                          />
                        </div>
                        <div className="text-sm font-bold text-orange-700">{count}</div>
                        <div className="text-xs text-orange-600 text-center truncate w-full" title={system.name}>
                          {system.name}
                        </div>
                      </div>
                    );
                  })}

                  {stats.oneTimeTasks > 0 && (
                    <div className="flex-1 flex flex-col items-center gap-1 min-w-[60px]">
                      <div className="w-full flex flex-col justify-end h-16">
                        <div
                          className="w-full bg-blue-400 rounded-t-lg"
                          style={{
                            height: `${(stats.oneTimeTasks / maxCount) * 100}%`
                          }}
                        />
                      </div>
                      <div className="text-sm font-bold text-blue-700">{stats.oneTimeTasks}</div>
                      <div className="text-xs text-blue-600 text-center">חד פעמיות</div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>

        {/* 4. Tasks by status */}
        <div className="bg-green-50 border-r-4 border-green-500 rounded-lg p-4">
          <div className="text-lg font-bold text-green-700 mb-3 text-center">לפי סטטוס</div>
          <div className="flex items-end justify-between gap-2 h-24">
            {/* New */}
            {stats.byStatus.new > 0 && (
              <div className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col justify-end h-16">
                  <div
                    className="w-full bg-gray-500 rounded-t-lg"
                    style={{
                      height: `${(stats.byStatus.new / Math.max(stats.byStatus.new, stats.byStatus.sent, stats.byStatus.inProgress, stats.byStatus.completed, 1)) * 100}%`
                    }}
                  />
                </div>
                <div className="text-sm font-bold text-green-700">{stats.byStatus.new}</div>
                <div className="text-xs text-green-600">חדש</div>
              </div>
            )}

            {/* Sent */}
            {stats.byStatus.sent > 0 && (
              <div className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col justify-end h-16">
                  <div
                    className="w-full bg-blue-500 rounded-t-lg"
                    style={{
                      height: `${(stats.byStatus.sent / Math.max(stats.byStatus.new, stats.byStatus.sent, stats.byStatus.inProgress, stats.byStatus.completed, 1)) * 100}%`
                    }}
                  />
                </div>
                <div className="text-sm font-bold text-green-700">{stats.byStatus.sent}</div>
                <div className="text-xs text-green-600">נשלח</div>
              </div>
            )}

            {/* In Progress */}
            {stats.byStatus.inProgress > 0 && (
              <div className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col justify-end h-16">
                  <div
                    className="w-full bg-yellow-500 rounded-t-lg"
                    style={{
                      height: `${(stats.byStatus.inProgress / Math.max(stats.byStatus.new, stats.byStatus.sent, stats.byStatus.inProgress, stats.byStatus.completed, 1)) * 100}%`
                    }}
                  />
                </div>
                <div className="text-sm font-bold text-green-700">{stats.byStatus.inProgress}</div>
                <div className="text-xs text-green-600">בביצוע</div>
              </div>
            )}

            {/* Completed */}
            {stats.byStatus.completed > 0 && (
              <div className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col justify-end h-16">
                  <div
                    className="w-full bg-green-500 rounded-t-lg"
                    style={{
                      height: `${(stats.byStatus.completed / Math.max(stats.byStatus.new, stats.byStatus.sent, stats.byStatus.inProgress, stats.byStatus.completed, 1)) * 100}%`
                    }}
                  />
                </div>
                <div className="text-sm font-bold text-green-700">{stats.byStatus.completed}</div>
                <div className="text-xs text-green-600">הושלם</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Timeline Chart - Next 7 Days */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <h3 className="text-lg font-semibold mb-4">משימות לשבוע הקרוב</h3>
        <div className="flex items-end justify-between gap-2 h-40 pt-4">
          {timelineData.timeline.map((day, index) => {
            const barHeight = (day.count / timelineData.maxCount) * 100;
            return (
              <div
                key={index}
                onClick={() => setSelectedDate(day.date)}
                className="flex-1 flex flex-col items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
              >
                {/* Bar */}
                <div className="w-full flex flex-col justify-end h-28">
                  <div
                    className={`w-full rounded-t-lg transition-all duration-300 ${
                      day.isToday
                        ? 'bg-blue-500'
                        : day.count > 0
                        ? 'bg-primary'
                        : 'bg-gray-200'
                    }`}
                    style={{ height: `${barHeight}%` }}
                  />
                </div>
                {/* Count */}
                <div
                  className={`text-sm font-bold ${
                    day.isToday ? 'text-blue-700' : 'text-gray-700'
                  }`}
                >
                  {day.count}
                </div>
                {/* Date */}
                <div className="text-center">
                  <div
                    className={`text-xs font-semibold ${
                      day.isToday ? 'text-blue-600' : 'text-gray-600'
                    }`}
                  >
                    {day.dayLabel}
                  </div>
                  <div
                    className={`text-xs ${
                      day.isToday ? 'text-blue-500' : 'text-gray-500'
                    }`}
                  >
                    {day.dateLabel}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress Bar - All Today's Tasks */}
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

      {/* Main Content - Split Layout */}
      <div className="grid grid-cols-12 gap-6">
        {/* Recurring Tasks (All Systems) - RIGHT SIDE */}
        <div className="col-span-8">
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">
                משימות קבועות ({recurringTasks.length})
              </h2>
              <button
                onClick={handleSendAllTasks}
                disabled={isSendingBulk}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
                className="border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="">כל המשימות</option>
                <option value="priority">סנן לפי עדיפות</option>
                <option value="system">סנן לפי מערכת</option>
                <option value="status">סנן לפי סטטוס</option>
                <option value="employee">סנן לפי עובד</option>
              </select>

              {/* Secondary filter - Value selection based on category */}
              {filterCategory && (
                <select
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2"
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

            <div className="space-y-3">
              {recurringTasks.length === 0 ? (
                <p className="text-gray-500 text-center py-8">אין משימות קבועות להיום</p>
              ) : (
                recurringTasks.map((task) => (
                  <TaskCard key={task.id} task={task} onEdit={handleEdit} />
                ))
              )}
            </div>
          </div>
        </div>

        {/* One-Time and Late Tasks - LEFT SIDE */}
        <div className="col-span-4">
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-xl font-bold mb-4">משימות חד פעמיות ({oneTimeTasks.length})</h2>

            <div className="space-y-3">
              {oneTimeTasks.length === 0 ? (
                <p className="text-gray-500 text-center py-4">אין משימות חד פעמיות להיום</p>
              ) : (
                oneTimeTasks.map((task) => (
                  <TaskCard key={task.id} task={task} onEdit={handleEdit} />
                ))
              )}
            </div>

            {lateTasks.length > 0 && (
              <>
                <div className="my-4 border-t border-gray-300" />
                <h3 className="text-lg font-semibold text-red-600 mb-3">
                  משימות באיחור
                </h3>
                <div className="space-y-3">
                  {lateTasks.map((task) => (
                    <div key={task.id} className="border-2 border-red-300 rounded-lg">
                      <TaskCard task={task} onEdit={handleEdit} />
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
