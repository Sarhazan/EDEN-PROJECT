import { useSearchParams } from 'react-router-dom';
import { useMemo } from 'react';

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

export function useHistoryFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Parse filters from URL — default start/end to today if not set
  const filters = useMemo(() => ({
    startDate: searchParams.get('start') || todayStr(),
    endDate: searchParams.get('end') || todayStr(),
    employeeId: searchParams.get('employee') || '',
    systemId: searchParams.get('system') || '',
    locationId: searchParams.get('location') || '',
    search: searchParams.get('search') || '',
  }), [searchParams]);

  // Update single filter
  const updateFilter = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    newParams.delete('offset');
    setSearchParams(newParams);
  };

  // Update multiple filters at once (prevents race conditions from sequential updates)
  const updateFilters = (updates) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
    });
    newParams.delete('offset');
    setSearchParams(newParams);
  };

  // Clear all filters → reset to today's default (not truly empty)
  const clearFilters = () => {
    const today = todayStr();
    setSearchParams(new URLSearchParams({ start: today, end: today }));
  };

  return { filters, updateFilter, updateFilters, clearFilters };
}
