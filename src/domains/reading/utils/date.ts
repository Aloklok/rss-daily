import { TimeSlot } from '@/shared/types'; // Assuming we export TimeSlot from shared types index or article

/**
 * Shanghai is UTC+8.
 * Shanghai YYYY-MM-DD 00:00:00 = UTC YYYY-MM-DD-1 16:00:00
 * Shanghai YYYY-MM-DD 23:59:59.999 = UTC YYYY-MM-DD 15:59:59.999
 */
export const shanghaiDayToUtcWindow = (date: string): { startIso: string; endIso: string } => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Invalid date format: ${date}. Expected YYYY-MM-DD`);
  }

  const [year, month, day] = date.split('-').map(Number);

  const startDate = new Date(Date.UTC(year, month - 1, day - 1, 16, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, month - 1, day, 15, 59, 59, 999));

  return {
    startIso: startDate.toISOString(),
    endIso: endDate.toISOString(),
  };
};

export const shanghaiDateSlotToUtcWindow = (
  date: string,
  slot?: TimeSlot | null,
): { startIso: string; endIso: string } => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Invalid date format: ${date}. Expected YYYY-MM-DD`);
  }

  if (!slot) {
    return shanghaiDayToUtcWindow(date);
  }

  const [year, month, day] = date.split('-').map(Number);

  let startHourUtc: number;
  let endHourUtc: number;

  if (slot === 'morning') {
    startHourUtc = 0 - 8;
    endHourUtc = 11 - 8;
  } else if (slot === 'afternoon') {
    startHourUtc = 12 - 8;
    endHourUtc = 18 - 8;
  } else if (slot === 'evening') {
    startHourUtc = 19 - 8;
    endHourUtc = 23 - 8;
  } else {
    return shanghaiDayToUtcWindow(date);
  }

  const startDate = new Date(Date.UTC(year, month - 1, day, startHourUtc, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, month - 1, day, endHourUtc, 59, 59, 999));

  return {
    startIso: startDate.toISOString(),
    endIso: endDate.toISOString(),
  };
};

export const getArticleTimeSlot = (dateString: string | undefined): TimeSlot => {
  if (!dateString) return 'morning';

  const date = new Date(dateString);
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

export const getShanghaiHour = (): number => {
  const dateString = new Date().toLocaleString('en-US', {
    timeZone: 'Asia/Shanghai',
    hour12: false,
  });
  const hourString = dateString.split(', ')[1].split(':')[0];
  return parseInt(hourString, 10);
};

export const getCurrentTimeSlot = (hour?: number): TimeSlot => {
  const h = hour !== undefined ? hour : getShanghaiHour();
  if (h >= 0 && h < 12) return 'morning';
  if (h >= 12 && h < 19) return 'afternoon';
  return 'evening';
};
