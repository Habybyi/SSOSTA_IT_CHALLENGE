const num = (id) => Math.max(0, parseFloat($("#" + id).value) || 0),
  mode = () => $("[name=mode]:checked").value;
let step = 1,
  calc = null;
const total = () => (mode() === "draw" ? polyArea() : num("L") * num("W"));
const parts = () => {
  const t = total(),
    usable = Math.max(0, t - num("house") - num("terr") - num("path")),
    beds = Math.min(num("beds"), usable);
  return { t, usable, beds, lawn: usable - beds };
};
function show() {
  $$(".st").forEach((e) => e.classList.toggle("hide", +e.dataset.s !== step));
  $$(".prog i").forEach((e, i) => e.classList.toggle("on", i < step));
  $("#bk").style.visibility = step > 1 ? "visible" : "hidden";
  $("#nx").classList.toggle("hide", step === 4);
  if (step === 2) {
    const p = parts();
    $("#lawnInfo").textContent =
      "Trávnik: " + Math.round(p.lawn) + " m² · využiteľná plocha: " + Math.round(p.usable) + " m²";
  }
  if (step === 4) result();
}
function result() {
  const p = parts(),
    mains = $("#water").value === "mains",
    per = mains ? 150 : 100;
  const lz = Math.ceil(p.lawn / per),
    bz = Math.ceil(p.beds / 100),
    hz = Math.ceil(num("hedge") / 60),
    zones = Math.max(1, lz + bz + hz);
  let b =
    350 +
    lz * 480 +
    (bz + hz) * 400 +
    (mains ? 0 : 350) +
    ($("#rain").checked ? 90 : 0) +
    ($("#mob").checked ? 180 : 0);
  const from = Math.round((b * 0.9) / 10) * 10,
    to = Math.round((b * 1.2) / 10) * 10;
  calc = {
    area: Math.round(p.t),
    lawn: Math.round(p.lawn),
    beds: Math.round(p.beds),
    hedge: num("hedge"),
    zones,
    water: $("#water").value,
    rain: $("#rain").checked,
    mobile: $("#mob").checked,
    priceFrom: from,
    priceTo: to,
  };
  $("#price").textContent = from.toLocaleString("sk") + " – " + to.toLocaleString("sk") + " €";
  $("#kv").innerHTML =
    `<div><b>${zones}</b>odhadovaný počet zón</div><div><b>${calc.lawn} m²</b>trávnik (postrekovače)</div><div><b>${calc.beds} m² + ${calc.hedge} m</b>záhony a plot (kvapková)</div><div><b>${mains ? "Vodovod" : "Studňa"}</b>zdroj vody</div>`;
  track("calc_complete", { zones });
}
$("#nx").onclick = () => {
  $("#cerr").textContent = "";
  if (step === 1) {
    if (total() <= 0) {
      $("#cerr").textContent = "Zadajte rozmery alebo zakreslite pozemok.";
      return;
    }
    if (parts().usable <= 0) {
      $("#cerr").textContent = "Odpočty sú väčšie než plocha pozemku.";
      return;
    }
    track("calc_start");
  }
  step++;
  show();
};
$("#bk").onclick = () => {
  step--;
  show();
};
show();
