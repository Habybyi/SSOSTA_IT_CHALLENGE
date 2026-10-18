// Práca s dňami v čase firmy (process.env.TZ nastavuje config.js).
// Deň sa medzi klientom a serverom posiela ako "YYYY-MM-DD", čas ako "HH:MM".

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export const isDay = (value) => typeof value === "string" && DAY_RE.test(value);
export const isTime = (value) => typeof value === "string" && TIME_RE.test(value);

export function dayStart(day) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

export function addDays(day, count) {
  const date = dayStart(day);
  date.setDate(date.getDate() + count);
  return dayKey(date);
}

export const dayEnd = (day) => dayStart(addDays(day, 1));

export function dayKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function atTime(day, time) {
  const [h, min] = time.split(":").map(Number);
  const date = dayStart(day);
  date.setHours(h, min, 0, 0);
  return date;
}

export const timeOf = (date) => {
  const d = new Date(date);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

// Stĺpec @db.Date v Postgrese: polnoc UTC daného dňa.
export function dbDate(day) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export const dbDateToDay = (date) => new Date(date).toISOString().slice(0, 10);

// 1 = pondelok ... 7 = nedeľa
export const isoWeekday = (day) => ((dayStart(day).getDay() + 6) % 7) + 1;

export const addMinutes = (date, minutes) => new Date(new Date(date).getTime() + minutes * 60_000);

export const todayKey = () => dayKey(new Date());

export function eachDay(from, to) {
  const days = [];
  for (let day = from; day <= to; day = addDays(day, 1)) days.push(day);
  return days;
}

export const formatDaySk = (date) =>
  new Date(date).toLocaleDateString("sk-SK", { weekday: "long", day: "numeric", month: "numeric", year: "numeric" });

export const formatTimeSk = (date) => new Date(date).toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit" });
