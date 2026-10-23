/* Formuláre napojené na Custodia CRM (verejné API, rovnaká adresa ako web) */
const PHONE_HINT = "Skúste to znova alebo nám zavolajte na +421 900 123 456.";

// Odoslanie do CRM. Chyby vracia po slovensky (CRM ich posiela aj pri konkrétnom poli).
async function postCRM(path, data) {
  let r;
  try {
    r = await fetch(CFG.crm + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch (e) {
    throw new Error("Nepodarilo sa spojiť so serverom. " + PHONE_HINT);
  }
  const d = await r.json().catch(() => ({}));
  if (!r.ok) {
    const field = d.fields && Object.values(d.fields)[0];
    throw new Error(field || d.error || "Odoslanie zlyhalo. " + PHONE_HINT);
  }
  return d;
}

const okMail = (v) => /^\S+@\S+\.\S+$/.test(v),
  okTel = (v) => v.replace(/[^\d]/g, "").length >= 9;

// Počas odosielania zablokovať tlačidlo, aby nevznikli dve rovnaké požiadavky.
async function submitting(form, fn) {
  const btn = form.querySelector("[type=submit]");
  const label = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Odosielam…";
  try {
    return await fn();
  } finally {
    btn.disabled = false;
    btn.textContent = label;
  }
}

// ----- Dopyt z kalkulačky -----
$("#lead").onsubmit = async (e) => {
  e.preventDefault();
  const n = $("#ln").value.trim(),
    t = $("#lp").value,
    m = $("#le").value.trim(),
    er = $("#lerr");
  er.textContent = "";
  if (!n || !okTel(t) || !okMail(m)) {
    er.textContent = "Vyplňte meno, platný telefón a e-mail.";
    return;
  }
  if (!$("#lc").checked) {
    er.textContent = "Potrebujeme váš súhlas so spracovaním údajov.";
    return;
  }
  try {
    const d = await submitting(e.target, () =>
      postCRM("/requests", {
        source: "CALCULATOR",
        name: n,
        phone: t,
        email: m,
        description: `Dopyt z kalkulačky: počet zón ${calc.zones}, pozemok ${calc.area} m², orientačne ${calc.priceFrom} až ${calc.priceTo} €.`,
        payload: { ...calc, utm: src.utm, referrer: src.referrer },
        gdprConsent: true,
        website: $("#lw").value,
      }),
    );
    track("lead_submit", { from: "calculator" });
    e.target.innerHTML = `<div class="ok">Ďakujeme! Dopyt č. ${esc(d.number ?? "")} aj s výsledkom kalkulácie sme prijali. Potvrdenie sme vám poslali e-mailom, ozveme sa do 24 hodín a dohodneme obhliadku.</div>`;
    $("#nv").classList.add("hide");
  } catch (err) {
    er.textContent = err.message;
  }
};

// ----- Porucha alebo termín servisu -----
const SERVICE_TYPES = { porucha: "FAULT", spustenie: "SPRING_START", zazimovanie: "WINTERIZATION" };
let daysLoaded = false;

// Voľné dni podľa kapacity v CRM: zákazník si nevyberie deň, ktorý je už plný.
async function loadFreeDays() {
  if (daysLoaded) return;
  const sel = $("#sd");
  try {
    const r = await fetch(CFG.crm + "/availability?days=60");
    const { days } = await r.json();
    sel.innerHTML = days.length
      ? '<option value="">Vyberte deň</option>' +
        days
          .map((d) => {
            const label = new Date(d.date + "T12:00:00").toLocaleDateString("sk-SK", { weekday: "long", day: "numeric", month: "numeric" });
            return `<option value="${esc(d.date)}">${esc(label)} (voľné miesta: ${d.free})</option>`;
          })
          .join("")
      : '<option value="">Najbližšie dni sú plné, zavolajte nám</option>';
    daysLoaded = true;
  } catch (e) {
    sel.innerHTML = '<option value="">Termíny sa nepodarilo načítať, zavolajte nám</option>';
  }
}

$("#st").onchange = () => {
  const p = $("#st").value === "porucha";
  $("#dt").classList.toggle("hide", p);
  $("#dt-hint").classList.toggle("hide", p);
  $("#ur").classList.toggle("hide", !p);
  if (!p) loadFreeDays();
};

$("#sf").onsubmit = async (e) => {
  e.preventDefault();
  const g = (i) => $("#" + i).value.trim(),
    er = $("#serr"),
    kind = g("st"),
    isFault = kind === "porucha";
  er.textContent = "";
  if (!g("sn") || !okTel(g("sp")) || !okMail(g("se")) || !g("sa") || !g("sm")) {
    er.textContent = "Vyplňte meno, telefón, e-mail, ulicu a obec záhrady.";
    return;
  }
  if (!isFault && !g("sd")) {
    er.textContent = "Vyberte voľný termín.";
    return;
  }
  if (isFault && !g("sx")) {
    er.textContent = "Stručne popíšte poruchu.";
    return;
  }
  if (!$("#sc").checked) {
    er.textContent = "Potrebujeme váš súhlas so spracovaním údajov.";
    return;
  }
  const common = {
    name: g("sn"),
    phone: g("sp"),
    email: g("se"),
    street: g("sa"),
    city: g("sm"),
    description: g("sx") || undefined,
    gdprConsent: true,
    website: $("#sw").value,
  };
  try {
    const d = await submitting(e.target, () =>
      isFault
        ? postCRM("/requests", { ...common, source: "WEB_FORM", type: "FAULT", urgent: $("#su").checked })
        : postCRM("/bookings", { ...common, type: SERVICE_TYPES[kind], date: g("sd") }),
    );
    track("service_submit", { type: kind });
    const when = isFault
      ? "Ozveme sa vám čo najskôr."
      : `Rezervovali sme vám ${new Date(d.date + "T12:00:00").toLocaleDateString("sk-SK", { weekday: "long", day: "numeric", month: "numeric" })}, presný čas potvrdíme e-mailom.`;
    e.target.innerHTML = `<div class="ok">Požiadavku č. ${esc(d.number ?? "")} sme prijali. ${when} Ďakujeme!</div>`;
  } catch (err) {
    er.textContent = err.message;
    // Deň mohol medzitým niekto obsadiť: načítať znova.
    if (!isFault) {
      daysLoaded = false;
      loadFreeDays();
    }
  }
};
