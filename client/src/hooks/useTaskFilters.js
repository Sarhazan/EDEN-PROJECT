import { useEffect, useMemo, useState } from 'react';
import { isSameDay } from 'date-fns';
import { LS_KEYS } from '../config';

export function useTaskFilters(tasks, employees, systems, locations, selectedDate) {
  const [filterCategory, setFilterCategory] = useState('manager');
  const [filterValue, setFilterValue] = useState('');
  const [taskSearch, setTaskSearch] = useState('');
  const [starFilter, setStarFilter] = useState(() => {
    return localStorage.getItem(LS_KEYS.STAR_FILTER) === 'true';
  });

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === LS_KEYS.STAR_FILTER) {
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

  const handleCategoryChange = (category) => {
    setFilterCategory(category);
    setFilterValue('');
  };

  const filteredTasks = useMemo(() => {
    let list = tasks.filter((task) => isSameDay(new Date(task.start_date), selectedDate));

    if (starFilter) {
      list = list.filter((task) => task.is_starred);
    }

    if (taskSearch.trim()) {
      const q = taskSearch.trim().toLowerCase();
      list = list.filter((task) =>
        task.title?.toLowerCase().includes(q) ||
        task.description?.toLowerCase().includes(q)
      );
    }

    if (filterCategory === 'priority' && filterValue) {
      list = list.filter((task) => task.priority === filterValue);
    }

    if (filterCategory === 'system' && filterValue) {
      list = list.filter((task) => String(task.system_id || '') === String(filterValue));
    }

    if (filterCategory === 'status' && filterValue) {
      list = list.filter((task) => task.status === filterValue);
    }

    if (filterCategory === 'employee' && filterValue) {
      if (filterValue === 'general') {
        list = list.filter((task) => !task.employee_id);
      } else {
        list = list.filter((task) => String(task.employee_id || '') === String(filterValue));
      }
    }

    if (filterCategory === 'location' && filterValue) {
      if (filterValue === 'none') {
        list = list.filter((task) => !task.location_id);
      } else {
        list = list.filter((task) => String(task.location_id || '') === String(filterValue));
      }
    }

    return list;
  }, [tasks, selectedDate, starFilter, taskSearch, filterCategory, filterValue]);

  const filterOptions = useMemo(() => {
    return {
      employees,
      systems,
      locations,
    };
  }, [employees, systems, locations]);

  return {
    filteredTasks,
    filterOptions,
    filterCategory,
    setFilterCategory,
    filterValue,
    setFilterValue,
    taskSearch,
    setTaskSearch,
    starFilter,
    setStarFilter,
    handleCategoryChange,
  };
}