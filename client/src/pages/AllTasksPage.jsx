import { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import TaskCard from '../components/shared/TaskCard';

export default function AllTasksPage() {
  const { tasks, systems, setIsTaskModalOpen, setEditingTask } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSystem, setFilterSystem] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterFrequency, setFilterFrequency] = useState(''); // '' | 'one-time' | 'recurring'

  // Star filter state from localStorage
  const [starFilter, setStarFilter] = useState(() => {
    return localStorage.getItem('starFilter') === 'true';
  });

  // Listen to localStorage changes for star filter (cross-tab sync)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'starFilter') {
        setStarFilter(e.newValue === 'true');
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleEdit = (task) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  // Filter tasks based on filters
  const filteredTasks = useMemo(() => {
    let filtered = tasks;

    // Star filter - show only starred, exclude completed
    if (starFilter) {
      filtered = filtered.filter((t) => t.is_starred === 1 && t.status !== 'completed');
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter((t) =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // System filter
    if (filterSystem) {
      filtered = filtered.filter(
        (t) => t.system_id === parseInt(filterSystem)
      );
    }

    // Status filter
    if (filterStatus) {
      filtered = filtered.filter((t) => t.status === filterStatus);
    }

    // Frequency filter
    if (filterFrequency === 'one-time') {
      filtered = filtered.filter((t) => t.is_recurring === 0);
    } else if (filterFrequency === 'recurring') {
      filtered = filtered.filter((t) => t.is_recurring === 1);
    }

    return filtered;
  }, [tasks, searchQuery, filterSystem, filterStatus, filterFrequency, starFilter]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">כל המשימות</h1>
        <p className="text-gray-600 mt-1">סה"כ {filteredTasks.length} משימות</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <input
              type="text"
              placeholder="חיפוש משימות..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <select
              value={filterFrequency}
              onChange={(e) => setFilterFrequency(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="">כל המשימות</option>
              <option value="one-time">משימות חד-פעמיות</option>
              <option value="recurring">משימות חוזרות</option>
            </select>
          </div>

          <div>
            <select
              value={filterSystem}
              onChange={(e) => setFilterSystem(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="">כל המערכות</option>
              {systems.map((system) => (
                <option key={system.id} value={system.id}>
                  {system.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="">כל הסטטוסים</option>
              <option value="draft">חדש</option>
              <option value="sent">נשלח</option>
              <option value="in_progress">בביצוע</option>
              <option value="completed">הושלם</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
            לא נמצאו משימות
          </div>
        ) : (
          filteredTasks.map((task) => (
            <TaskCard key={task.id} task={task} onEdit={handleEdit} />
          ))
        )}
      </div>
    </div>
  );
}
