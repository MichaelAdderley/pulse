const DAY_LABELS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

export function dayLabelShort(date: Date): string {
  return DAY_LABELS_SHORT[date.getDay()];
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
