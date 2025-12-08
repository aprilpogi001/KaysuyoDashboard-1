const TIMEZONE = "Asia/Manila";

export interface PhilippineDateTime {
  date: string;
  time: string;
  hours: number;
  minutes: number;
  totalMinutes: number;
  dayName: string;
  year: number;
}

export function getPhilippineDateTime(): PhilippineDateTime {
  const now = new Date();
  
  // Get formatted parts directly using Intl.DateTimeFormat for accuracy
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'long'
  });
  
  const parts = formatter.formatToParts(now);
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || '';
  
  const phYear = parseInt(getPart('year'));
  const phMonth = getPart('month');
  const phDay = getPart('day');
  const hours = parseInt(getPart('hour'));
  const minutes = parseInt(getPart('minute'));
  const dayName = getPart('weekday');
  
  const date = `${phYear}-${phMonth}-${phDay}`;
  const totalMinutes = hours * 60 + minutes;
  
  // Format time with AM/PM
  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  const time = timeFormatter.format(now);

  return {
    date,
    time,
    hours,
    minutes,
    totalMinutes,
    dayName,
    year: phYear
  };
}

export function getPhilippineDateOnly(): string {
  return getPhilippineDateTime().date;
}

export function getPhilippineDayName(short: boolean = false): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    weekday: short ? 'short' : 'long'
  });
  return formatter.format(now);
}

export function getPhilippineDate(daysOffset: number = 0): { 
  date: string; 
  dayShort: string; 
  dayFull: string; 
  year: number 
} {
  const now = new Date();
  // Add days offset in milliseconds
  const targetDate = new Date(now.getTime() + daysOffset * 24 * 60 * 60 * 1000);
  
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  const parts = formatter.formatToParts(targetDate);
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || '';
  
  const phYear = parseInt(getPart('year'));
  const phMonth = getPart('month');
  const phDay = getPart('day');
  
  const dayShortFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    weekday: 'short'
  });
  
  const dayFullFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    weekday: 'long'
  });
  
  return {
    date: `${phYear}-${phMonth}-${phDay}`,
    dayShort: dayShortFormatter.format(targetDate),
    dayFull: dayFullFormatter.format(targetDate),
    year: phYear
  };
}
