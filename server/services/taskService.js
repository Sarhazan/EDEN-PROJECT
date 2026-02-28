const { db } = require('../database/schema');
const { addMinutes, differenceInMinutes } = require('date-fns');

function calculateEstimatedEnd(task) {
  const isOneTime = task.is_recurring !== 1 || task.frequency === 'one-time';

  if (isOneTime) {
    const endTimeSetting = db.prepare(`SELECT value FROM settings WHERE key = 'workday_end_time'`).get();
    const workdayEnd = endTimeSetting?.value || '18:00';
    const dueDate = task.due_date || task.start_date;
    return new Date(`${dueDate}T${workdayEnd}:00`);
  }

  const taskStart = new Date(`${task.start_date}T${task.start_time}`);
  const durationMinutes = task.estimated_duration_minutes || 30;
  return addMinutes(taskStart, durationMinutes);
}

function formatMinutesToHebrew(totalMinutes) {
  const absMinutes = Math.abs(totalMinutes);

  const days = Math.floor(absMinutes / (24 * 60));
  const hours = Math.floor((absMinutes % (24 * 60)) / 60);
  const minutes = absMinutes % 60;

  const parts = [];

  if (days > 0) {
    parts.push(days === 1 ? 'יום אחד' : `${days} ימים`);
  }

  if (hours > 0) {
    parts.push(hours === 1 ? 'שעה אחת' : `${hours} שעות`);
  }

  if (minutes > 0 || parts.length === 0) {
    parts.push(minutes === 1 ? 'דקה אחת' : `${minutes} דקות`);
  }

  return parts.join(', ');
}

function getIsraelDateParts(now = new Date()) {
  const dateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now);

  const hhmm = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jerusalem',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(now);

  return { dateStr, hhmm };
}

function resolveCreateStatusForDate(targetDate, requestedStatus = 'draft') {
  const status = requestedStatus || 'draft';

  if (['completed', 'pending_approval', 'not_completed'].includes(status)) {
    return status;
  }

  const { dateStr: todayIsrael, hhmm: nowIsrael } = getIsraelDateParts(new Date());
  if (targetDate !== todayIsrael) return status;

  const endTimeSetting = db.prepare(`SELECT value FROM settings WHERE key = 'workday_end_time'`).get();
  const workdayEnd = endTimeSetting?.value || '18:00';

  return nowIsrael >= workdayEnd ? 'not_completed' : status;
}

function calculateTimeDelta(task) {
  if (!task.completed_at) {
    return {
      time_delta_minutes: null,
      time_delta_text: null
    };
  }

  const estimatedEnd = calculateEstimatedEnd(task);
  const actualEnd = new Date(task.completed_at);
  const deltaMinutes = differenceInMinutes(actualEnd, estimatedEnd);

  let deltaText;
  if (deltaMinutes < 0) {
    deltaText = `הושלם מוקדם ב-${formatMinutesToHebrew(deltaMinutes)}`;
  } else if (deltaMinutes > 0) {
    deltaText = `איחור של ${formatMinutesToHebrew(deltaMinutes)}`;
  } else {
    deltaText = 'הושלם בזמן';
  }

  return {
    time_delta_minutes: deltaMinutes,
    time_delta_text: deltaText
  };
}

function enrichTaskWithTiming(task) {
  if (task.status === 'completed' || task.status === 'not_completed') {
    return {
      ...task,
      ...calculateTimeDelta(task)
    };
  }

  const now = new Date();
  const estimatedEnd = calculateEstimatedEnd(task);
  const minutesRemaining = differenceInMinutes(estimatedEnd, now);

  const isLate = minutesRemaining < 0;
  const isNearDeadline = !isLate && minutesRemaining < 10;

  return {
    ...task,
    estimated_end_time: estimatedEnd.toTimeString().slice(0, 5),
    is_late: isLate,
    minutes_remaining: Math.abs(minutesRemaining),
    minutes_remaining_text: formatMinutesToHebrew(Math.abs(minutesRemaining)),
    timing_status: isLate ? 'late' : (isNearDeadline ? 'near-deadline' : 'on-time')
  };
}

module.exports = {
  calculateEstimatedEnd,
  enrichTaskWithTiming,
  formatMinutesToHebrew,
  getIsraelDateParts,
  resolveCreateStatusForDate,
  calculateTimeDelta,
};