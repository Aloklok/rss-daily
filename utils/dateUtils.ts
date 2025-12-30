import { TimeSlot } from '../types';

/**
 * 统一的上海日期 → UTC 窗口映射工具
 *
 * Shanghai is UTC+8.
 * 上海日期 YYYY-MM-DD 00:00:00 = UTC YYYY-MM-DD-1 16:00:00
 * 上海日期 YYYY-MM-DD 23:59:59.999 = UTC YYYY-MM-DD 15:59:59.999
 *
 * @param date 上海本地日期字符串（格式：YYYY-MM-DD）
 * @returns { startIso, endIso } 对应的 UTC ISO 8601 窗口
 */
export const shanghaiDayToUtcWindow = (date: string): { startIso: string; endIso: string } => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Invalid date format: ${date}. Expected YYYY-MM-DD`);
  }

  const [year, month, day] = date.split('-').map(Number);

  // Shanghai 00:00:00 = UTC previous day 16:00:00
  const startDate = new Date(Date.UTC(year, month - 1, day - 1, 16, 0, 0, 0));
  // Shanghai 23:59:59.999 = UTC same day 15:59:59.999
  const endDate = new Date(Date.UTC(year, month - 1, day, 15, 59, 59, 999));

  return {
    startIso: startDate.toISOString(),
    endIso: endDate.toISOString(),
  };
};

/**
 * 支持时间槽的上海日期 → UTC 窗口映射
 * Morning: 00:00 - 11:59
 * Afternoon: 12:00 - 18:59
 * Evening: 19:00 - 23:59
 *
 * @param date 上海本地日期字符串（格式：YYYY-MM-DD）
 * @param slot 时间槽：'morning' | 'afternoon' | 'evening' | undefined（undefined 表示全天）
 * @returns { startIso, endIso } 对应的 UTC ISO 8601 窗口
 */
export const shanghaiDateSlotToUtcWindow = (
  date: string,
  slot?: TimeSlot | null,
): { startIso: string; endIso: string } => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Invalid date format: ${date}. Expected YYYY-MM-DD`);
  }

  if (!slot) {
    // No slot specified, return full day window
    return shanghaiDayToUtcWindow(date);
  }

  const [year, month, day] = date.split('-').map(Number);

  // Shanghai is UTC+8. Calculate start and end hours in UTC.
  let startHourUtc: number;
  let endHourUtc: number;

  if (slot === 'morning') {
    // 00:00 - 11:59 Shanghai = 16:00 (prev day) - 03:59 UTC
    startHourUtc = 0 - 8; // 16 (prev day)
    endHourUtc = 11 - 8; // 03
  } else if (slot === 'afternoon') {
    // 12:00 - 18:59 Shanghai = 04:00 - 10:59 UTC
    startHourUtc = 12 - 8; // 04
    endHourUtc = 18 - 8; // 10
  } else if (slot === 'evening') {
    // 19:00 - 23:59 Shanghai = 11:00 - 15:59 UTC
    startHourUtc = 19 - 8; // 11
    endHourUtc = 23 - 8; // 15
  } else {
    // Unknown slot, default to full day
    return shanghaiDayToUtcWindow(date);
  }

  const startDate = new Date(Date.UTC(year, month - 1, day, startHourUtc, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, month - 1, day, endHourUtc, 59, 59, 999));

  return {
    startIso: startDate.toISOString(),
    endIso: endDate.toISOString(),
  };
};

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
