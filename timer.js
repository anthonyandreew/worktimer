export const DEFAULT_DURATION = 8 * 3600000;
export function initialState() {
  return { version: 1, work: { elapsed: 0, startedAt: null }, day: { duration: DEFAULT_DURATION, remaining: DEFAULT_DURATION, startedAt: null, announced: false } };
}
export function elapsed(work, now = Date.now()) {
  return work.elapsed + (work.startedAt === null ? 0 : Math.max(0, now - work.startedAt));
}
export function remaining(day, now = Date.now()) {
  return Math.max(0, day.remaining - (day.startedAt === null ? 0 : Math.max(0, now - day.startedAt)));
}
export function toggleWork(state, now = Date.now()) {
  if (state.work.startedAt === null) state.work.startedAt = now;
  else { state.work.elapsed = elapsed(state.work, now); state.work.startedAt = null; }
}
export function toggleDay(state, now = Date.now()) {
  if (state.day.startedAt === null) {
    if (state.day.remaining <= 0) state.day.remaining = state.day.duration;
    state.day.startedAt = now; state.day.announced = false;
  } else { state.day.remaining = remaining(state.day, now); state.day.startedAt = null; }
}
export function format(ms, roundUp = false) {
  const seconds = Math.max(0, (roundUp ? Math.ceil : Math.floor)(ms / 1000));
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60].map(n => String(n).padStart(2, '0')).join(':');
}
export function validState(s) {
  const finite = n => typeof n === 'number' && Number.isFinite(n) && n >= 0;
  const time = n => n === null || finite(n);
  return s?.version === 1 && s.work && s.day && finite(s.work.elapsed) && time(s.work.startedAt) && finite(s.day.duration) && s.day.duration > 0 && s.day.duration <= 100 * 3600000 && finite(s.day.remaining) && s.day.remaining <= s.day.duration && time(s.day.startedAt) && typeof s.day.announced === 'boolean';
}
