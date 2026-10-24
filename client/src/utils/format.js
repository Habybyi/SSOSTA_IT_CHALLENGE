export const fullName = (c) => [c.firstName, c.lastName].filter(Boolean).join(" ");

export const initials = (c) => `${c.firstName?.[0] || ""}${c.lastName?.[0] || ""}`.toUpperCase();

export const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString("sk-SK", { day: "numeric", month: "numeric", year: "numeric" }) : "";

export const gardenAddress = (g) => [g.street, [g.postalCode, g.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");

export const mapsUrl = (g) => {
  const query = g.latitude != null && g.longitude != null ? `${g.latitude},${g.longitude}` : gardenAddress(g);
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
};

export const toFormValues = (source, defaults) =>
  Object.fromEntries(
    Object.entries(defaults).map(([key, fallback]) => {
      const value = source?.[key];
      return [key, value === null || value === undefined ? fallback : typeof fallback === "string" ? String(value) : value];
    })
  );

export const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString("sk-SK", { day: "numeric", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "";

export const timeAgo = (value) => {
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 1) return "práve teraz";
  if (minutes < 60) return `pred ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `pred ${hours} h`;
  const days = Math.round(hours / 24);
  return days === 1 ? "včera" : `pred ${days} dňami`;
};

export const toDayKey = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const fromDayKey = (key) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const addDaysKey = (key, count) => {
  const d = fromDayKey(key);
  d.setDate(d.getDate() + count);
  return toDayKey(d);
};

export const mondayOf = (key) => {
  const d = fromDayKey(key);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return toDayKey(d);
};

export const formatTime = (value) =>
  new Date(value).toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit" });

export const timeOfDay = (value) => {
  const d = new Date(value);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export const formatDayShort = (key) =>
  fromDayKey(key).toLocaleDateString("sk-SK", { weekday: "short", day: "numeric", month: "numeric" });

export const formatDayLong = (key) =>
  fromDayKey(key).toLocaleDateString("sk-SK", { weekday: "long", day: "numeric", month: "long" });

export const capitalize = (text) => (text ? text.charAt(0).toUpperCase() + text.slice(1) : text);
