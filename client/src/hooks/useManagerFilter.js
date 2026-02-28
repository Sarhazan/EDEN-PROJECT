import { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL, LS_KEYS } from '../config';

export function useManagerFilter() {
  const [managerFilter, setManagerFilter] = useState(() => {
    const stored = localStorage.getItem(LS_KEYS.MANAGER_FILTER);
    return stored === null ? true : stored === 'true';
  });
  const [managerEmployeeId, setManagerEmployeeId] = useState(null);

  useEffect(() => {
    const cached = localStorage.getItem(LS_KEYS.MANAGER_EMPLOYEE_ID);
    if (cached) setManagerEmployeeId(parseInt(cached, 10));

    axios.get(`${API_URL}/accounts/settings/manager_employee_id`)
      .then((res) => {
        if (res.data.value) {
          const id = parseInt(res.data.value, 10);
          setManagerEmployeeId(id);
          localStorage.setItem(LS_KEYS.MANAGER_EMPLOYEE_ID, res.data.value);
        }
      })
      .catch(() => {});

    const handleManagerChanged = (e) => {
      const newId = e.detail?.id ? parseInt(e.detail.id, 10) : null;
      setManagerEmployeeId(newId);
    };

    window.addEventListener('manager:changed', handleManagerChanged);
    return () => window.removeEventListener('manager:changed', handleManagerChanged);
  }, []);

  const toggleManagerFilter = () => {
    setManagerFilter((prev) => {
      const next = !prev;
      localStorage.setItem(LS_KEYS.MANAGER_FILTER, String(next));
      return next;
    });
  };

  return { managerFilter, managerEmployeeId, toggleManagerFilter };
}