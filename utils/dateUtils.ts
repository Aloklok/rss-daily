import { TimeSlot } from '../types';

/**
 * Parses an ISO date string and returns the corresponding TimeSlot based on Shanghai time.
 * Logic matches server-side filtering:
 * Morning: 00:00 - 11:59
 * Afternoon: 12:00 - 18:59
 * Evening: 19:00 - 23:59
 */
export const getArticleTimeSlot = (dateString: string | undefined): TimeSlot => {
  if (!dateString) return 'morning'; // Default fallback

  const date = new Date(dateString);
  // Use Intl to get the hour in Shanghai timezone
  const hour = parseInt(
    new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      hour12: false,
      timeZone: 'Asia/Shanghai',
    }).format(date),
    10,
  );

  if (hour >= 0 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 19) return 'afternoon';
  return 'evening';
};

export const getTodayInShanghai = (): string => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Shanghai',
  });
  return formatter.format(new Date());
};

/**
 * Returns the current hour in Shanghai timezone.
 */
export const getShanghaiHour = (): number => {
  const dateString = new Date().toLocaleString('en-US', {
    timeZone: 'Asia/Shanghai',
    hour12: false,
  });
  const hourString = dateString.split(', ')[1].split(':')[0];
  return parseInt(hourString, 10);
};

/**
 * Returns the current TimeSlot based on the provided hour or current Shanghai time.
 */
export const getCurrentTimeSlot = (hour?: number): TimeSlot => {
  const h = hour !== undefined ? hour : getShanghaiHour();
  if (h >= 0 && h < 12) return 'morning';
  if (h >= 12 && h < 19) return 'afternoon';
  return 'evening';
};
