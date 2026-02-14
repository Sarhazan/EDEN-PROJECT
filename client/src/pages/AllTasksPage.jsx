import { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import TaskCard from '../components/shared/TaskCard';

export default function AllTasksPage() {
  const { tasks, setIsTaskModalOpen, setEditingTask } = useApp();
  const [searchQuery, setSearchQuery] = useState('');

  // Star filter state from localStorage
  const [starFilter, setStarFilter] = useState(() => {
    return localStorage.getItem('starFilter') === 'true';
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

  const handleEdit = (task) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  const searchTerm = searchQuery.trim().toLowerCase();

  const baseTasks = useMemo(() => {
    let filtered = [...tasks];

    // Star filter - show only starred, exclude completed
    if (starFilter) {
      filtered = filtered.filter((t) => t.is_starred === 1 && t.status !== 'completed');
    }

    // Text search (title + description)
    if (searchTerm) {
      filtered = filtered.filter((t) => {
        const haystack = `${t.title || ''} ${t.description || ''}`.toLowerCase();
        return haystack.includes(searchTerm);
      });
    }

    return filtered;
  }, [tasks, starFilter, searchTerm]);

  // Recurring tasks: show only the nearest instance for each recurring series
  const recurringNearestTasks = useMemo(() => {
    const recurring = baseTasks.filter((t) => Number(t.is_recurring) === 1 && t.status !== 'completed');
    const now = new Date();
    const bySeries = new Map();

    recurring.forEach((task) => {
      const key = task.parent_task_id || `${task.title}|${task.frequency}|${task.start_time}|${task.employee_id || ''}|${task.system_id || ''}`;
      const taskDate = new Date(`${task.start_date}T${task.start_time || '00:00'}`);
      const existing = bySeries.get(key);

      // Prefer future/upcoming instance; if none, keep closest in the future first
      if (!existing) {
        bySeries.set(key, task);
        return;
      }

      const existingDate = new Date(`${existing.start_date}T${existing.start_time || '00:00'}`);
      const taskFuture = taskDate >= now;
      const existingFuture = existingDate >= now;

      if (taskFuture && !existingFuture) {
        bySeries.set(key, task);
        return;
      }

      if (taskFuture === existingFuture && taskDate < existingDate) {
        bySeries.set(key, task);
      }
    });

    return Array.from(bySeries.values()).sort((a, b) => {
      const dateA = new Date(`${a.start_date}T${a.start_time || '00:00'}`);
      const dateB = new Date(`${b.start_date}T${b.start_time || '00:00'}`);
      return dateA - dateB;
    });
  }, [baseTasks]);

  const oneTimeTasks = useMemo(() => {
    return baseTasks
      .filter((t) => Number(t.is_recurring) !== 1)
      .sort((a, b) => {
        const dateA = new Date(`${a.start_date}T${a.start_time || '00:00'}`);
        const dateB = new Date(`${b.start_date}T${b.start_time || '00:00'}`);
        return dateA - dateB;
      });
  }, [baseTasks]);

  // Last 5 created tasks (history strip)
  const recentCreatedTasks = useMemo(() => {
    return [...baseTasks]
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, 5);
  }, [baseTasks]);

  const totalShown = recurringNearestTasks.length + oneTimeTasks.length;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">כל המשימות</h1>
        <p className="text-gray-600 mt-1">סה"כ {totalShown} משימות להצגה</p>
      </div>

      {/* Search only */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <input
          type="text"
          placeholder="חיפוש משימות..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
        />
      </div>

      {/* Recent created tasks container */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <h2 className="text-xl font-bold mb-4">נוצרו לאחרונה (5 אחרונות) ({recentCreatedTasks.length})</h2>
        <div className="space-y-0 rounded-lg overflow-hidden border border-gray-100">
          {recentCreatedTasks.length === 0 ? (
            <div className="p-6 text-center text-gray-500">אין היסטוריית יצירה להצגה</div>
          ) : (
            recentCreatedTasks.map((task) => (
              <TaskCard key={`recent-${task.id}`} task={task} onEdit={handleEdit} />
            ))
          )}
        </div>
      </div>

      {/* Recurring tasks container */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <h2 className="text-xl font-bold mb-4">משימות קבועות (מופע קרוב בלבד) ({recurringNearestTasks.length})</h2>
        <div className="space-y-0 rounded-lg overflow-hidden border border-gray-100">
          {recurringNearestTasks.length === 0 ? (
            <div className="p-6 text-center text-gray-500">אין משימות קבועות להצגה</div>
          ) : (
            recurringNearestTasks.map((task) => (
              <TaskCard key={task.id} task={task} onEdit={handleEdit} />
            ))
          )}
        </div>
      </div>

      {/* One-time tasks container */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <h2 className="text-xl font-bold mb-4">משימות חד פעמיות ({oneTimeTasks.length})</h2>
        <div className="space-y-0 rounded-lg overflow-hidden border border-gray-100">
          {oneTimeTasks.length === 0 ? (
            <div className="p-6 text-center text-gray-500">אין משימות חד פעמיות להצגה</div>
          ) : (
            oneTimeTasks.map((task) => (
              <TaskCard key={task.id} task={task} onEdit={handleEdit} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
