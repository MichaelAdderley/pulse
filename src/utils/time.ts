export function formatRemaining(seconds: number): string {
  const clamped = Math.max(0, Math.ceil(seconds));
  if (clamped < 60) return `${clamped} sec`;
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}
