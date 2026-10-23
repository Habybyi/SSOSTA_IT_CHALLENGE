/* Konfigurácia webu a pomocné funkcie. Toto je jediné miesto, kde sa menia nastavenia. */
const CFG = {
  brand: "Custodia",

  // CRM: verejné API Custodia CRM (beží na tej istej adrese ako web).
  // Kalkulačka a porucha -> /requests, jarné spustenie a zazimovanie -> /bookings, voľné dni -> /availability.
  crm: "/api/v1/public",

  // Google Analytics 4: meracie ID v tvare "G-XXXXXXXXXX". Načíta sa až po súhlase s analytikou.
  ga4: "",

  // AI asistent (Google Gemini, free tier). Kľúč zadarmo: https://aistudio.google.com/apikey
  ai: {
    // Otázky idú cez CRM server, kľúč je v server/.env (GEMINI_API_KEY), prehliadač ho nevidí.
    // Bez kľúča asistent odpovedá z pripravených otázok (FAQ v assistant.js).
    proxy: "/api/v1/public/assistant",
    // Kľúč sem nedávaj: uvidel by ho každý návštevník webu.
    key: "",
    model: "gemini-3.5-flash-lite",
  },
};

const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)];

// Bezpečný prístup k localStorage (v súkromnom okne môže zlyhať)
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

// Plynulý presun na sekciu (používa menu, AI asistent aj hlasové príkazy)
function goTo(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

$$("[data-brand]").forEach((e) => (e.textContent = CFG.brand));
