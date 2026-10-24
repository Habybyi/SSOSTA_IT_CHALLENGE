const MAP_CENTER = [49.0598, 20.2975];
let lmap = null,
  lpts = [],
  llayer = null,
  useLeaflet = false;

let leafletPromise = null;
const hasLeaflet = () => !!(window.L && typeof window.L.map === "function");
function loadLeaflet() {
  if (hasLeaflet()) return Promise.resolve();
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((ok, fail) => {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
    document.head.appendChild(css);
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
    s.onload = ok;
    s.onerror = fail;
    document.head.appendChild(s);
    setTimeout(() => (hasLeaflet() ? ok() : fail()), 8000);
  });
  return leafletPromise;
}

function initLeaflet() {
  useLeaflet = true;
  $("#lmap").classList.remove("hide");
  $("#cv").classList.add("hide");
  $("#draw-hint").textContent =
    "Nájdite svoju adresu, priblížte pozemok a klikajte na jeho rohy. Plocha sa spočíta sama.";
  if (lmap) return lmap.invalidateSize();
  lmap = L.map("lmap", { zoomControl: true }).setView(MAP_CENTER, 17);
  L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    { maxZoom: 19, attribution: "Snímky &copy; Esri" },
  ).addTo(lmap);
  lmap.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
  llayer = L.layerGroup().addTo(lmap);
  lmap.on("click", (e) => {
    lpts.push([e.latlng.lat, e.latlng.lng]);
    draw();
  });
}

function geoArea(p) {
  if (p.length < 3) return 0;
  const R = 6378137,
    rad = Math.PI / 180;
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const [la1, lo1] = p[i],
      [la2, lo2] = p[(i + 1) % p.length];
    a += (lo2 - lo1) * rad * (2 + Math.sin(la1 * rad) + Math.sin(la2 * rad));
  }
  return Math.abs((a * R * R) / 2);
}

const cv = $("#cv"),
  cx = cv.getContext("2d"),
  PX = 12;
let pts = [];
const cs = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

function gridArea() {
  if (pts.length < 3) return 0;
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i],
      n = pts[(i + 1) % pts.length];
    a += p[0] * n[1] - n[0] * p[1];
  }
  return Math.abs(a) / 2 / (PX * PX);
}

function polyArea() {
  return useLeaflet ? geoArea(lpts) : gridArea();
}

function draw() {
  if (useLeaflet && llayer) {
    llayer.clearLayers();
    if (lpts.length > 1)
      L.polygon(lpts, {
        color: "#ffffff",
        weight: 3,
        fillColor: "#86c58a",
        fillOpacity: 0.45,
      }).addTo(llayer);
    lpts.forEach((p) =>
      L.circleMarker(p, {
        radius: 6,
        color: "#fff",
        weight: 2,
        fillColor: "#2f7d32",
        fillOpacity: 1,
      }).addTo(llayer),
    );
  } else {
    cx.clearRect(0, 0, 600, 360);
    cx.strokeStyle = cs("--line") || "#ccc";
    cx.lineWidth = 1;
    for (let x = 0; x <= 600; x += PX * 5) {
      cx.beginPath();
      cx.moveTo(x, 0);
      cx.lineTo(x, 360);
      cx.stroke();
    }
    for (let y = 0; y <= 360; y += PX * 5) {
      cx.beginPath();
      cx.moveTo(0, y);
      cx.lineTo(600, y);
      cx.stroke();
    }
    if (pts.length) {
      cx.beginPath();
      pts.forEach((p, i) => (i ? cx.lineTo(p[0], p[1]) : cx.moveTo(p[0], p[1])));
      cx.closePath();
      cx.fillStyle = "rgba(134,197,138,.5)";
      cx.fill();
      cx.strokeStyle = "#2f7d32";
      cx.lineWidth = 3;
      cx.stroke();
      pts.forEach((p) => {
        cx.beginPath();
        cx.arc(p[0], p[1], 5, 0, 7);
        cx.fillStyle = "#2f7d32";
        cx.fill();
      });
    }
  }
  const a = polyArea();
  $("#pa").textContent = a > 0 ? "≈ " + Math.round(a).toLocaleString("sk") + " m²" : "";
}

cv.addEventListener("pointerdown", (e) => {
  const r = cv.getBoundingClientRect();
  pts.push([((e.clientX - r.left) * 600) / r.width, ((e.clientY - r.top) * 360) / r.height]);
  draw();
});

$("#undo").onclick = () => {
  (useLeaflet ? lpts : pts).pop();
  draw();
};
$("#clr").onclick = () => {
  if (useLeaflet) lpts = [];
  else pts = [];
  draw();
};

async function findAddress() {
  const qv = $("#addr").value.trim(),
    msg = $("#addr-msg");
  if (!qv || !lmap) return;
  msg.textContent = "Hľadám…";
  try {
    const r = await fetch(
      "https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=sk&q=" +
        encodeURIComponent(qv),
      { headers: { "Accept-Language": "sk" } },
    );
    const d = await r.json();
    if (!d.length) {
      msg.textContent = "Adresu sa nepodarilo nájsť, skúste ju zadať presnejšie.";
      return;
    }
    lmap.setView([+d[0].lat, +d[0].lon], 19);
    msg.textContent = "";
  } catch (e) {
    msg.textContent = "Vyhľadávanie je nedostupné, posuňte mapu ručne.";
  }
}
$("#addr-go").onclick = findAddress;
$("#addr").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    findAddress();
  }
});

function useGrid() {
  useLeaflet = false;
  $("#lmap").classList.add("hide");
  $("#addr-row").classList.add("hide");
  $("#cv").classList.remove("hide");
  $("#draw-hint").textContent =
    "Mapa sa nenačítala. Klikajte na rohy pozemku, jedna mriežka = 5 × 5 m.";
  draw();
}

$$("[name=mode]").forEach(
  (r) =>
    (r.onchange = () => {
      if (!r.checked) return;
      const d = r.value === "draw";
      $("#m-dim").classList.toggle("hide", d);
      $("#m-draw").classList.toggle("hide", !d);
      if (d)
        loadLeaflet()
          .then(initLeaflet)
          .catch((e) => {
            console.warn("Mapa nedostupná, používam mriežku:", e);
            useGrid();
          });
    }),
);
draw();
