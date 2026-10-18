export const fullName = (c) => [c.firstName, c.lastName].filter(Boolean).join(" ");

export const initials = (c) => `${c.firstName?.[0] || ""}${c.lastName?.[0] || ""}`.toUpperCase();

export const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString("sk-SK", { day: "numeric", month: "numeric", year: "numeric" }) : "";

export const gardenAddress = (g) => [g.street, [g.postalCode, g.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");

// Odkaz do máp: GPS ak je vyplnené, inak adresa. Funguje na mobile aj PC.
export const mapsUrl = (g) => {
  const query = g.latitude != null && g.longitude != null ? `${g.latitude},${g.longitude}` : gardenAddress(g);
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
};

// Prázdne polia z API (null) na prázdne reťazce pre formulár.
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

// "pred 5 min", "pred 3 h", "pred 2 dňami": Milan hneď vidí, ako dlho niekto čaká.
export const timeAgo = (value) => {
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 1) return "práve teraz";
  if (minutes < 60) return `pred ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `pred ${hours} h`;
  const days = Math.round(hours / 24);
  return days === 1 ? "včera" : `pred ${days} dňami`;
};
