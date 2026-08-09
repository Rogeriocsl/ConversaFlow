const DEFAULT_SCHEDULE = Object.freeze({ enabled: false, start: '08:00', end: '20:00' });

function parseHHMM(value) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(value || '').trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function sanitizeSchedule(value, defaults = DEFAULT_SCHEDULE) {
  const schedule = { ...defaults, ...(value || {}) };
  return {
    enabled: Boolean(schedule.enabled),
    start: parseHHMM(schedule.start) == null ? defaults.start : schedule.start,
    end: parseHHMM(schedule.end) == null ? defaults.end : schedule.end,
  };
}

function isNowWithinSchedule(value, now = new Date()) {
  const schedule = sanitizeSchedule(value);
  if (!schedule.enabled) return true;
  const current = now.getHours() * 60 + now.getMinutes();
  const start = parseHHMM(schedule.start);
  const end = parseHHMM(schedule.end);
  if (start === end) return true;
  return start < end ? current >= start && current < end : current >= start || current < end;
}

function formatSchedule(value, now = new Date()) {
  const schedule = sanitizeSchedule(value);
  if (!schedule.enabled) return 'desativado';
  return `${schedule.start}–${schedule.end} (${isNowWithinSchedule(schedule, now) ? 'agora: dentro' : 'agora: fora'})`;
}

module.exports = { DEFAULT_SCHEDULE, parseHHMM, sanitizeSchedule, isNowWithinSchedule, formatSchedule };
