import { useEffect, useState } from 'react';
import { LS_KEYS } from '../config';

export function useColumnResize() {
  const [columnWidths, setColumnWidths] = useState(() => {
    const stored = localStorage.getItem(LS_KEYS.COLUMN_WIDTHS);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse column widths:', e);
      }
    }
    return { left: '60%', right: 'auto' };
  });

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      localStorage.setItem(LS_KEYS.COLUMN_WIDTHS, JSON.stringify(columnWidths));
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [columnWidths]);

  return { columnWidths, setColumnWidths };
}