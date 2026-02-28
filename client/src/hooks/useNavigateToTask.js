import { useEffect, useRef, useState } from 'react';

export function useNavigateToTask(setSelectedDate, retryDeps = []) {
  const [highlightTaskId, setHighlightTaskId] = useState(null);
  const [pendingNavigateTaskId, setPendingNavigateTaskId] = useState(null);
  const navigateRetryRef = useRef(0);

  useEffect(() => {
    const parseISODate = (value) => {
      if (!value) return null;
      const [year, month, day] = value.split('-').map(Number);
      if (!year || !month || !day) return null;
      return new Date(year, month - 1, day);
    };

    const handleNavigateToTask = (e) => {
      const { taskId, startDate, source } = e.detail || {};
      if (!taskId || !startDate || source !== 'toast-button') return;

      const taskDate = parseISODate(startDate);
      if (taskDate) setSelectedDate(taskDate);

      setHighlightTaskId(taskId);
      setPendingNavigateTaskId(taskId);
      navigateRetryRef.current = 0;
    };

    window.addEventListener('myday:navigate-to-task', handleNavigateToTask);
    return () => window.removeEventListener('myday:navigate-to-task', handleNavigateToTask);
  }, [setSelectedDate]);

  useEffect(() => {
    if (!pendingNavigateTaskId) return;

    const taskId = pendingNavigateTaskId;
    const maxRetries = 20;
    const retryDelayMs = 250;

    const tryScroll = () => {
      const el = document.getElementById(`task-${taskId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => setHighlightTaskId(null), 4500);
        setPendingNavigateTaskId(null);
        navigateRetryRef.current = 0;
        return;
      }

      navigateRetryRef.current += 1;
      if (navigateRetryRef.current >= maxRetries) {
        setTimeout(() => setHighlightTaskId(null), 2500);
        setPendingNavigateTaskId(null);
        navigateRetryRef.current = 0;
        return;
      }

      setTimeout(tryScroll, retryDelayMs);
    };

    tryScroll();
  }, [pendingNavigateTaskId, ...retryDeps]);

  return { highlightTaskId };
}