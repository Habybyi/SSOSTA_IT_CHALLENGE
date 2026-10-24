export const WEB_EVENT_TYPES = ["page_view", "calc_start", "calc_complete", "lead_submit", "service_submit", "chat_message"];

const KNOWN_SOURCES = [
  [/google\./, "Google"],
  [/(^|\.)(facebook|fb|m\.facebook|l\.facebook)\.|^fb$|^facebook$/, "Facebook"],
  [/instagram|^ig$/, "Instagram"],
  [/bing\./, "Bing"],
  [/seznam\./, "Seznam"],
  [/youtube\.|youtu\.be/, "YouTube"],
];

export function normalizeSource(raw) {
  const value = String(raw || "").trim().toLowerCase().slice(0, 80);
  if (!value || value === "priamo" || value === "direct") return "Priamo";
  for (const [pattern, label] of KNOWN_SOURCES) if (pattern.test(value)) return label;
  return value.replace(/^www\./, "").replace(/[^a-z0-9.\-_ ]/g, "").slice(0, 60) || "Iné";
}

export const isBot = (userAgent) => /bot|crawl|spider|slurp|headless|preview/i.test(userAgent || "");
