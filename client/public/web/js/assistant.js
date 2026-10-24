const AI_SYSTEM = `Si priateľský asistent firmy ${CFG.brand} na jej webe. Odpovedáš vždy po slovensky, stručne (najviac 3 až 4 vety), vecne a zdvorilo, vykáš.
O firme: ${CFG.brand} navrhuje a inštaluje smart závlahu ovládanú mobilom, robí sezónny servis (jarné spustenie v apríli, jesenné zazimovanie v októbri pred prvými mrazmi) a pravidelnú starostlivosť o trávnik (kosenie, vertikutácia, hnojenie). Hodnoty: kvalita, smart, plne autonómne, bez starostí. Firma má 5 rokov skúseností a pôsobí v Poprade, Svite, Kežmarku, Vysokých Tatrách, Spišskej Belej a okolí.
Kontakt: Milan Kováč, konateľ, telefón +421 900 123 456, e-mail milan.kovac@custodia.sk, Instagram @custodia_sk, Facebook Custodia, sídlo Ul. 29. augusta 4812, 058 01 Poprad.
Smart závlaha: senzory vlhkosti pôdy a dažďový senzor, zohľadnenie predpovede počasia, ovládanie a sledovanie z mobilu na diaľku. Trávnik sa polieva postrekovačmi, záhony a živý plot kvapkovou závlahou. Zdrojom môže byť vodovod aj studňa.
Ceny: nikdy nevymýšľaj konkrétne sumy. Orientačnú cenu ukáže kalkulačka na webe, presnú ponuku pripraví firma po bezplatnej obhliadke.
Akcie: keď to pomôže, pridaj na koniec odpovede značku, z ktorej web urobí tlačidlo: [[kalkulacka]] (výpočet ceny), [[porucha]] (nahlásenie poruchy), [[spustenie]] (objednať jarné spustenie), [[zazimovanie]] (objednať zazimovanie), [[kontakt]] (kontakty a mapa), [[sluzby]] (prehľad služieb). Najviac dve značky.
Nepýtaj si osobné údaje v chate, na to slúžia formuláre na webe. Na otázky mimo záhrad, závlahy a firmy zdvorilo odpovedz, že pomáhaš len s témami firmy. Ak niečo nevieš, odporuč zavolať alebo napísať firme.`;

const FAQ = [
  [
    ["cena", "stoj", "kolko", "koľko", "rozpočet", "drahé", "eur"],
    "Orientačnú cenu si spočítate v kalkulačke na webe, trvá to asi minútu. Presnú ponuku pripravíme po bezplatnej obhliadke. [[kalkulacka]]",
  ],
  [
    ["zazimov", "zima", "jesen", "jeseň", "mráz", "mraz"],
    "Zazimovanie robíme v októbri, ešte pred prvými mrazmi. Prefúkneme rozvody, aby voda v potrubí nezamrzla. Termín si môžete objednať cez formulár. [[zazimovanie]]",
  ],
  [
    ["spusten", "jar", "apríl", "april"],
    "Jarné spustenie robíme zvyčajne v apríli. Skontrolujeme tlak, ventily a postrekovače a systém nastavíme na sezónu. [[spustenie]]",
  ],
  [
    ["porucha", "nefunguje", "nejde", "pokazen", "únik", "unik", "tečie", "tece"],
    "To nás mrzí. Poruchu nahlásite cez servisný formulár, pri úniku vody zaškrtnite haváriu a ozveme sa prednostne. [[porucha]]",
  ],
  [
    ["smart", "mobil", "aplikác", "aplikac", "senzor", "počasie", "pocasie", "diaľku", "dialku"],
    "Smart závlaha polieva podľa vlhkosti pôdy a predpovede počasia, pred dažďom polievanie preskočí. Všetko sledujete a ovládate z mobilu. [[sluzby]]",
  ],
  [
    ["kosen", "vertikut", "hnoj", "trávnik", "travnik", "starostliv"],
    "O trávnik sa staráme pravidelne: kosenie, vertikutácia a hnojenie. Dohodneme frekvenciu podľa vašej záhrady. [[kontakt]]",
  ],
  [
    ["studň", "studn", "vodovod", "voda"],
    "Závlahu vieme napojiť na vodovod aj na studňu. Pri studni navrhneme vhodné čerpadlo. [[kalkulacka]]",
  ],
  [
    ["kde", "pôsob", "posob", "poprad", "kežmar", "kezmar", "tatr", "svit"],
    "Pôsobíme v Poprade, Svite, Kežmarku, Vysokých Tatrách, Spišskej Belej a okolí. [[kontakt]]",
  ],
  [
    [
      "kontakt",
      "instagram",
      "facebook",
      "sociál",
      "socia",
      "telefón",
      "telefon",
      "číslo",
      "cislo",
      "mail",
      "zavolať",
      "zavolat",
    ],
    "Zavolajte Milanovi Kováčovi na +421 900 123 456 alebo napíšte na milan.kovac@custodia.sk. Novinky a realizácie nájdete na Instagrame @custodia_sk a na Facebooku Custodia. [[kontakt]]",
  ],
  [
    ["obhliad"],
    "Obhliadka je bezplatná. Najjednoduchšie je spočítať si cenu v kalkulačke a poslať dopyt, ozveme sa do 24 hodín. [[kalkulacka]]",
  ],
];
const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
function faqAnswer(text) {
  const t = norm(text);
  let best = null,
    score = 0;
  for (const [keys, ans] of FAQ) {
    const sc = keys.filter((k) => t.includes(norm(k))).length;
    if (sc > score) {
      score = sc;
      best = ans;
    }
  }
  return (
    best ||
    "Pomôžem vám so závlahou, servisom a starostlivosťou o trávnik. Môžete sa spýtať napríklad na cenu, zazimovanie alebo nahlásenie poruchy. [[kalkulacka]] [[kontakt]]"
  );
}

const ACTIONS = {
  kalkulacka: ["Otvoriť kalkulačku", () => goTo("kalkulacka")],
  porucha: ["Nahlásiť poruchu", () => openService("porucha")],
  spustenie: ["Objednať spustenie", () => openService("spustenie")],
  zazimovanie: ["Objednať zazimovanie", () => openService("zazimovanie")],
  kontakt: ["Kontakt a mapa", () => goTo("kontakt")],
  sluzby: ["Pozrieť služby", () => goTo("sluzby")],
};
function openService(type) {
  const sel = $("#st");
  sel.value = type;
  sel.dispatchEvent(new Event("change"));
  goTo("servis");
}

const chat = { history: [], busy: false, speak: st.get("chat_speak") !== false };
const box = $("#ai-msgs");

function setOpen(open) {
  $("#ai").classList.toggle("open", open);
  $("#ai-fab").setAttribute("aria-expanded", open);
  if (open) {
    track("chat_open");
    setTimeout(() => $("#ai-in").focus(), 50);
  } else stopSpeaking();
}
$("#ai-fab").onclick = () => setOpen(!$("#ai").classList.contains("open"));
$("#ai-x").onclick = () => setOpen(false);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && $("#ai").classList.contains("open")) setOpen(false);
});

function format(text) {
  return esc(text)
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/\n/g, "<br>");
}

function addMsg(role, text) {
  const acts = [...new Set([...text.matchAll(/\[\[(\w+)\]\]/g)].map((m) => m[1]))].filter(
    (a) => ACTIONS[a],
  );
  const clean = text.replace(/\[\[\w+\]\]/g, "").trim();
  const el = document.createElement("div");
  el.className = "msg " + role;
  el.innerHTML = format(clean);
  if (acts.length) {
    const row = document.createElement("div");
    row.className = "acts";
    acts.forEach((a) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = ACTIONS[a][0];
      b.onclick = () => {
        ACTIONS[a][1]();
        if (matchMedia("(max-width: 700px)").matches) setOpen(false);
      };
      row.appendChild(b);
    });
    el.appendChild(row);
  }
  box.appendChild(el);
  box.scrollTop = box.scrollHeight;
  return { clean, acts };
}

function typing(on) {
  let t = $("#ai-typing");
  if (on && !t) {
    t = document.createElement("div");
    t.id = "ai-typing";
    t.className = "msg bot typing";
    t.innerHTML = "<i></i><i></i><i></i>";
    t.setAttribute("aria-label", "Asistent píše");
    box.appendChild(t);
    box.scrollTop = box.scrollHeight;
  } else if (!on && t) t.remove();
}

async function askGemini() {
  const body = {
    system_instruction: { parts: [{ text: AI_SYSTEM }] },
    contents: chat.history.slice(-12),
    generationConfig: { temperature: 0.4, maxOutputTokens: 800 },
  };
  let url,
    headers = { "Content-Type": "application/json" };
  if (CFG.ai.proxy) url = CFG.ai.proxy;
  else if (CFG.ai.key) {
    url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(CFG.ai.model)}:generateContent`;
    headers["x-goog-api-key"] = CFG.ai.key;
  } else return null;
  const r = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  if (!r.ok) throw new Error("Gemini " + r.status);
  const d = await r.json();
  const text = (d.candidates?.[0]?.content?.parts || [])
    .map((p) => p.text || "")
    .join("")
    .trim();
  if (!text) throw new Error("Prázdna odpoveď");
  return text;
}

async function send(text, fromVoice) {
  text = text.trim();
  if (!text || chat.busy) return;
  chat.busy = true;
  $("#ai-chips").classList.add("hide");
  addMsg("me", text);
  $("#ai-in").value = "";
  chat.history.push({ role: "user", parts: [{ text }] });
  track("chat_message", { voice: !!fromVoice });
  typing(true);
  let answer;
  try {
    answer = (await askGemini()) || faqAnswer(text);
  } catch (e) {
    console.warn("AI nedostupná, používam záložné odpovede:", e);
    answer = faqAnswer(text);
  }
  typing(false);
  chat.history.push({ role: "model", parts: [{ text: answer }] });
  const { clean, acts } = addMsg("bot", answer);
  chat.busy = false;
  if (fromVoice) {
    if (chat.speak) speak(clean);
    if (acts.length === 1 && /otvor|ukáž|ukaz|choď|chod|prejdi|objednaj|nahlás|nahlas/i.test(text))
      ACTIONS[acts[0]][1]();
  }
}

$("#ai-form").onsubmit = (e) => {
  e.preventDefault();
  send($("#ai-in").value, false);
};
$$("#ai-chips button").forEach((b) => (b.onclick = () => send(b.textContent, false)));

const synth = window.speechSynthesis;
function skVoice() {
  return (
    (synth.getVoices() || []).find((v) => /^sk/i.test(v.lang)) ||
    (synth.getVoices() || []).find((v) => /^cs/i.test(v.lang))
  );
}
function speak(text) {
  if (!synth) return;
  stopSpeaking();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "sk-SK";
  const v = skVoice();
  if (v) u.voice = v;
  u.rate = 1.02;
  synth.speak(u);
}
function stopSpeaking() {
  if (synth && synth.speaking) synth.cancel();
}
function paintSpeak() {
  $("#ai-spk").setAttribute("aria-pressed", chat.speak);
  $("#ai-spk").title = chat.speak
    ? "Čítanie odpovedí nahlas: zapnuté"
    : "Čítanie odpovedí nahlas: vypnuté";
  $("#ai-spk").classList.toggle("off", !chat.speak);
}
if (synth) {
  $("#ai-spk").onclick = () => {
    chat.speak = !chat.speak;
    st.set("chat_speak", chat.speak);
    if (!chat.speak) stopSpeaking();
    paintSpeak();
  };
  paintSpeak();
} else $("#ai-spk").classList.add("hide");

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null,
  listening = false;
if (SR) {
  rec = new SR();
  rec.lang = "sk-SK";
  rec.interimResults = true;
  rec.maxAlternatives = 1;
  let finalText = "";
  rec.onresult = (e) => {
    let interim = "";
    finalText = "";
    for (const r of e.results)
      r.isFinal ? (finalText += r[0].transcript) : (interim += r[0].transcript);
    $("#ai-in").value = finalText || interim;
  };
  rec.onend = () => {
    listening = false;
    $("#ai-mic").classList.remove("rec");
    $("#ai-mic").setAttribute("aria-pressed", "false");
    $("#ai-in").placeholder = "Napíšte otázku…";
    const t = $("#ai-in").value.trim();
    if (t) {
      track("voice_input");
      send(t, true);
    }
  };
  rec.onerror = (e) => {
    if (e.error === "not-allowed" || e.error === "service-not-allowed")
      addMsg(
        "bot",
        "Mikrofón je zablokovaný. Povoľte ho v prehliadači (ikona zámku vedľa adresy) a skúste znova.",
      );
    else if (e.error === "no-speech") addMsg("bot", "Nič som nepočul, skúste to znova.");
  };
  $("#ai-mic").onclick = () => {
    if (listening) return rec.stop();
    stopSpeaking();
    $("#ai-in").value = "";
    try {
      rec.start();
      listening = true;
      $("#ai-mic").classList.add("rec");
      $("#ai-mic").setAttribute("aria-pressed", "true");
      $("#ai-in").placeholder = "Počúvam…";
    } catch (e) {}
  };
} else {
  $("#ai-mic").classList.add("hide");
}

addMsg(
  "bot",
  `Dobrý deň, som asistent ${CFG.brand}. Poradím so závlahou, servisom aj starostlivosťou o trávnik.` +
    (SR ? " Môžete písať alebo kliknúť na mikrofón a spýtať sa hlasom." : ""),
);
