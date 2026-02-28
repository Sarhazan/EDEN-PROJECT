import { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import TaskCard from '../components/shared/TaskCard';

export default function AllTasksPage() {
  const { tasks, setIsTaskModalOpen, setEditingTask, deleteTaskSeries } = useApp();
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

  // Recurring tasks: one row per series, nearest future instance
  // Key excludes start_time so duplicate series (same name + freq + employee) collapse to one
  const recurringNearestTasks = useMemo(() => {
    const recurring = baseTasks.filter((t) => Number(t.is_recurring) === 1 && t.status !== 'completed');
    const now = new Date();
    const bySeries = new Map();

    recurring.forEach((task) => {
      // Intentionally exclude start_time from key so time-edited duplicates collapse
      const key = `${task.title}|${task.frequency}|${task.employee_id || ''}|${task.system_id || ''}`;
      const taskDate = new Date(`${task.start_date}T${task.start_time || '00:00'}`);
      const existing = bySeries.get(key);

      if (!existing) { bySeries.set(key, task); return; }

      const existingDate = new Date(`${existing.start_date}T${existing.start_time || '00:00'}`);
      const taskFuture = taskDate >= now;
      const existingFuture = existingDate >= now;

      if (taskFuture && !existingFuture) { bySeries.set(key, task); return; }
      if (taskFuture === existingFuture && taskDate < existingDate) { bySeries.set(key, task); }
    });

    return Array.from(bySeries.values());
  }, [baseTasks]);

  // Group recurring tasks by frequency, in display order
  const FREQ_ORDER = ['daily', 'weekly', 'biweekly', 'monthly', 'semi-annual', 'annual'];
  const FREQ_LABELS = { daily: 'יומי', weekly: 'שבועי', biweekly: 'שבועיים', monthly: 'חודשי', 'semi-annual': 'חצי שנתי', annual: 'שנתי' };

  const recurringByFreq = useMemo(() => {
    const groups = {};
    recurringNearestTasks.forEach((task) => {
      const freq = task.frequency || 'other';
      if (!groups[freq]) groups[freq] = [];
      groups[freq].push(task);
    });
    // Sort tasks within each group by nearest date
    Object.values(groups).forEach((arr) =>
      arr.sort((a, b) => new Date(`${a.start_date}T${a.start_time || '00:00'}`) - new Date(`${b.start_date}T${b.start_time || '00:00'}`))
    );
    return groups;
  }, [recurringNearestTasks]);

  const oneTimeTasks = useMemo(() => {
    return baseTasks
      .filter((t) => Number(t.is_recurring) !== 1)
      .sort((a, b) => {
        const dateA = new Date(`${a.start_date}T${a.start_time || '00:00'}`);
        const dateB = new Date(`${b.start_date}T${b.start_time || '00:00'}`);
        return dateA - dateB;
      });
  }, [baseTasks]);

  // Last 5 created items (dedup recurring batches to a single row)
  const recentCreatedTasks = useMemo(() => {
    const sorted = [...baseTasks].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    const byCreatedItem = new Map();

    sorted.forEach((task) => {
      const isRecurring = Number(task.is_recurring) === 1;
      const recurringKey = `${task.title}|${task.frequency}|${task.start_time}|${task.employee_id || ''}|${task.system_id || ''}|${task.created_at || ''}`;
      const key = isRecurring ? `recurring:${task.parent_task_id || recurringKey}` : `one-time:${task.id}`;

      if (!byCreatedItem.has(key)) {
        byCreatedItem.set(key, task);
      }
    });

    return Array.from(byCreatedItem.values())
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

      {/* Recurring tasks container — grouped by frequency */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <h2 className="text-xl font-bold mb-4">משימות קבועות ({recurringNearestTasks.length})</h2>
        {recurringNearestTasks.length === 0 ? (
          <div className="p-6 text-center text-gray-500">אין משימות קבועות להצגה</div>
        ) : (
          <div className="space-y-5">
            {[...FREQ_ORDER, ...Object.keys(recurringByFreq).filter(f => !FREQ_ORDER.includes(f))].map((freq) => {
              const group = recurringByFreq[freq];
              if (!group || group.length === 0) return null;
              return (
                <div key={freq}>
                  {/* Frequency header */}
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <span className="text-sm font-bold text-gray-500 uppercase tracking-wide">
                      {FREQ_LABELS[freq] || freq}
                    </span>
                    <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{group.length}</span>
                    <div className="flex-1 h-px bg-gray-100" />
                  </div>
                  <div className="rounded-lg overflow-hidden border border-gray-100">
                    {group.map((task) => (
                      <div key={task.id} className="relative group">
                        <TaskCard task={task} onEdit={handleEdit} />
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (!window.confirm(`למחוק את כל המופעים של "${task.title}"?\n\nכל הסדרה תימחק לצמיתות.`)) return;
                            try { await deleteTaskSeries(task.id); }
                            catch (err) { alert('שגיאה: ' + err.message); }
                          }}
                          className="absolute left-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-50 border border-red-200 text-red-600 text-xs px-2 py-1 rounded-lg hover:bg-red-100"
                          title="מחק משימה קבועה כולה"
                        >
                          🗑️ מחק קבועה
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
