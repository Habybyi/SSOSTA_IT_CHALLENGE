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
