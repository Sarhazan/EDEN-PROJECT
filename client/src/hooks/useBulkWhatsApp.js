import { useState } from 'react';
import axios from 'axios';
import { format, isSameDay } from 'date-fns';
import { API_URL } from '../config';

export function useBulkWhatsApp({
  tasks,
  selectedDate,
  filterCategory,
  filterValue,
  employees,
  shouldTaskAppearOnDate,
  updateTaskStatus,
}) {
  const [isSendingBulk, setIsSendingBulk] = useState(false);

  const handleBulkSend = async () => {
    const now = new Date();
    const currentTime = format(now, 'HH:mm');

    const allTasksForDate = tasks.filter((t) => shouldTaskAppearOnDate(t, selectedDate));

    let tasksToSend = allTasksForDate.filter((task) => {
      if (task.status !== 'draft') return false;
      if (!task.employee_id) return false;
      if (!task.start_time || task.start_time === '00:00') return false;

      if (isSameDay(new Date(task.start_date), selectedDate) && task.start_time < currentTime) {
        return false;
      }

      return true;
    });

    if (filterCategory === 'employee' && filterValue) {
      if (filterValue === 'general') {
        tasksToSend = tasksToSend.filter((t) => !t.employee_id);
      } else {
        tasksToSend = tasksToSend.filter((t) => t.employee_id === parseInt(filterValue, 10));
      }
    }

    if (tasksToSend.length === 0) {
      alert('אין משימות לשליחה (כל המשימות כבר נשלחו או ללא שעת התחלה)');
      return;
    }

    const tasksByEmployee = {};
    tasksToSend.forEach((task) => {
      if (!tasksByEmployee[task.employee_id]) {
        const employee = employees.find((emp) => emp.id === task.employee_id);
        if (!employee) return;

        tasksByEmployee[task.employee_id] = {
          phone: employee.phone,
          name: employee.name,
          tasks: [],
          date: format(new Date(task.start_date), 'dd/MM/yyyy'),
          language: employee.language || 'he',
        };
      }

      tasksByEmployee[task.employee_id].tasks.push({
        id: task.id,
        title: task.title,
        description: task.description,
        start_time: task.start_time,
        priority: task.priority || 'normal',
        system_name: task.system_name,
        estimated_duration_minutes: task.estimated_duration_minutes,
        status: task.status,
      });
    });

    const extraTasks = tasks.filter((t) =>
      t.employee_id &&
      t.start_date === format(selectedDate, 'yyyy-MM-dd') &&
      (!t.start_time || t.start_time === '' || t.start_time === '00:00') &&
      Number(t.is_recurring) === 0 &&
      !['not_completed', 'cancelled', 'completed', 'sent'].includes(t.status)
    );

    for (const task of extraTasks) {
      if (!task.employee_id || !tasksByEmployee[task.employee_id]) continue;
      if (!tasksByEmployee[task.employee_id].extraTasks) {
        tasksByEmployee[task.employee_id].extraTasks = [];
      }
      tasksByEmployee[task.employee_id].extraTasks.push({
        id: task.id,
        title: task.title,
        description: task.description,
      });
    }

    const employeeCount = Object.keys(tasksByEmployee).length;
    const confirmMessage =
      filterCategory === 'employee' && filterValue
        ? `האם לשלוח ${tasksToSend.length} משימות ל-${tasksByEmployee[Object.keys(tasksByEmployee)[0]]?.name}?`
        : `האם לשלוח ${tasksToSend.length} משימות ל-${employeeCount} עובדים?`;

    if (!confirm(confirmMessage)) return;

    setIsSendingBulk(true);
    try {
      const response = await axios.post(
        `${API_URL}/whatsapp/send-bulk`,
        { tasksByEmployee },
        { timeout: 120000 }
      );

      const successfulEmployeeIds = (response.data?.results || [])
        .filter((r) => r.success)
        .map((r) => String(r.employeeId));

      const sentTaskIds = successfulEmployeeIds.flatMap((employeeId) => {
        const group = tasksByEmployee[employeeId];
        return group?.tasks?.map((t) => t.id) || [];
      });

      for (const taskId of sentTaskIds) {
        await updateTaskStatus(taskId, 'sent');
      }

      alert(response.data.message);
    } catch (error) {
      alert('שגיאה: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsSendingBulk(false);
    }
  };

  return { isSendingBulk, handleBulkSend };
}
