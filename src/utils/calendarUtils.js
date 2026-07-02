import moment from 'moment';

export function isRecurringOnDate(event, date) {
  if (!event.is_recurring || !event.recurrence_frequency) return false;
  const start = moment(event.start_time);
  const checkDate = moment(date);
  if (checkDate.isBefore(start, 'day')) return false;
  if (event.recurrence_end_date && checkDate.isAfter(moment(event.recurrence_end_date), 'day')) return false;
  const interval = event.recurrence_interval || 1;

  if (event.recurrence_frequency === 'weekly') {
    const days = event.recurrence_days || [];
    if (!days.includes(checkDate.day())) return false;
    const startWeek = moment(start).startOf('week');
    const checkWeek = moment(checkDate).startOf('week');
    const weekDiff = checkWeek.diff(startWeek, 'weeks');
    return weekDiff >= 0 && weekDiff % interval === 0;
  }

  if (event.recurrence_frequency === 'monthly') {
    const monthDiff = (checkDate.year() - start.year()) * 12 + (checkDate.month() - start.month());
    if (monthDiff < 0 || monthDiff % interval !== 0) return false;

    if (event.recurrence_week && event.recurrence_weekday !== undefined && event.recurrence_weekday !== null) {
      if (checkDate.day() !== event.recurrence_weekday) return false;
      if (event.recurrence_week === -1) {
        const daysInMonth = moment(checkDate).endOf('month').date();
        return checkDate.date() > daysInMonth - 7;
      }
      return Math.ceil(checkDate.date() / 7) === event.recurrence_week;
    }

    return checkDate.date() === start.date();
  }

  return false;
}

export function getEventsForDay(events, date) {
  return events.filter((e) => {
    if (!e.start_time) return false;
    if (e.is_recurring && e.recurrence_frequency) return isRecurringOnDate(e, date);
    return moment(e.start_time).isSame(date, 'day');
  });
}