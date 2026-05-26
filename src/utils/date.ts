const MS_PER_DAY = 24 * 60 * 60 * 1000;

const DAY_LABELS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function dayLabelShort(date: Date): string {
  return DAY_LABELS_SHORT[date.getDay()];
}

export function formatHeader(date: Date): string {
  const today = startOfDay(new Date());
  const target = startOfDay(date);
  const diffDays = Math.round((target.getTime() - today.getTime()) / MS_PER_DAY);
  if (diffDays === 0) return 'Today';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays === 1) return 'Tomorrow';
  return `${DAY_LABELS_SHORT[date.getDay()]}, ${MONTH_LABELS[date.getMonth()]} ${date.getDate()}`;
}

export function buildVisibleWeek(centerDate: Date, length: number = 6): Date[] {
  const days: Date[] = [];
  const start = addDays(centerDate, -1);
  for (let i = 0; i < length; i++) {
    days.push(startOfDay(addDays(start, i)));
  }
  return days;
}

export function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  return addDays(d, -d.getDay());
}

export function buildFullWeek(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export function diffInWeeks(weekStartA: Date, weekStartB: Date): number {
  const ms = weekStartA.getTime() - weekStartB.getTime();
  return Math.round(ms / (7 * 24 * 60 * 60 * 1000));
}
