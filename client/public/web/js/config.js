const CFG = {
  brand: "Custodia",

  crm: "/api/v1/public",

  ga4: "",

  ai: {
    proxy: "/api/v1/public/assistant",
    key: "",
    model: "gemini-3.5-flash-lite",
  },
};

const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)];

const st = {
  get(k) {
    try {
      return JSON.parse(localStorage.getItem(k));
    } catch (e) {
      return null;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch (e) {}
  },
};

const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

function goTo(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

$$("[data-brand]").forEach((e) => (e.textContent = CFG.brand));
