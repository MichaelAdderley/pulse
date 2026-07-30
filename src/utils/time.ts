export function formatRemaining(seconds: number): string {
  const clamped = Math.max(0, Math.ceil(seconds));
  if (clamped < 60) return `${clamped} sec`;
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function formatDurationLabel(seconds: number): string {
  if (seconds < 60) return `${seconds} sec`;
  if (seconds % 60 === 0) return `${seconds / 60} min`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}
