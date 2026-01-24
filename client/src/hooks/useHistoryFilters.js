import { useSearchParams } from 'react-router-dom';
import { useMemo } from 'react';

export function useHistoryFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Parse filters from URL - memoized to prevent infinite loops
  const filters = useMemo(() => ({
    startDate: searchParams.get('start') || '',
    endDate: searchParams.get('end') || '',
    employeeId: searchParams.get('employee') || '',
    systemId: searchParams.get('system') || '',
    locationId: searchParams.get('location') || '',
  }), [searchParams]);

  // Update single filter
  const updateFilter = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    newParams.delete('offset'); // Reset pagination on filter change
    setSearchParams(newParams);
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  return { filters, updateFilter, clearFilters };
}
