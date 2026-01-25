import { useState, useEffect, useMemo } from 'react';
import { useHistoryFilters } from '../hooks/useHistoryFilters';
import HistoryFilters from '../components/history/HistoryFilters';
import HistoryStats from '../components/history/HistoryStats';
import HistoryTable from '../components/history/HistoryTable';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function HistoryPage() {
  const { filters, updateFilter, updateFilters, clearFilters } = useHistoryFilters();
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [systems, setSystems] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);

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

  // Fetch filter options on mount
  useEffect(() => {
    fetch(`${API_URL}/employees`)
      .then(r => r.json())
      .then(setEmployees)
      .catch(err => console.error('Failed to fetch employees:', err));

    fetch(`${API_URL}/systems`)
      .then(r => r.json())
      .then(setSystems)
      .catch(err => console.error('Failed to fetch systems:', err));

    fetch(`${API_URL}/locations`)
      .then(r => r.json())
      .then(setLocations)
      .catch(err => console.error('Failed to fetch locations:', err));
  }, []);

  // Fetch history when filters change
  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        // Build query string from filters
        const queryParams = new URLSearchParams();

        if (filters.startDate) queryParams.set('startDate', filters.startDate);
        if (filters.endDate) queryParams.set('endDate', filters.endDate);
        if (filters.employeeId) queryParams.set('employeeId', filters.employeeId);
        if (filters.systemId) queryParams.set('systemId', filters.systemId);
        if (filters.locationId) queryParams.set('locationId', filters.locationId);

        const response = await fetch(`${API_URL}/history?${queryParams.toString()}`);
        const data = await response.json();

        setTasks(data.tasks);
        setStats(data.stats);
      } catch (error) {
        console.error('Failed to fetch history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [filters]);

  // Apply star filter to tasks (after other filters from backend)
  const filteredTasks = useMemo(() => {
    if (starFilter) {
      // Show only starred tasks, exclude completed (though history is all completed)
      return tasks.filter((t) => t.is_starred === 1 && t.status !== 'completed');
    }
    return tasks;
  }, [tasks, starFilter]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">היסטוריית משימות</h1>

      <HistoryStats stats={stats} />

      <HistoryFilters
        filters={filters}
        employees={employees}
        systems={systems}
        locations={locations}
        onFilterChange={updateFilter}
        onApplyFilters={updateFilters}
        onClear={clearFilters}
      />

      <HistoryTable tasks={filteredTasks} loading={loading} />
    </div>
  );
}
