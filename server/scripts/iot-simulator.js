// Simulátor senzorov pre prezentáciu: demo zariadenia posielajú hodnoty cez to isté API ako Packet Tracer.
//   npm run iot:simulate            každých 5 s nové hodnoty
//   npm run iot:simulate -- --leak  po 15 s nahlási únik vody v prvej záhrade (vznikne požiadavka)
import "dotenv/config";
import crypto from "node:crypto";
import { prisma } from "../src/lib/prisma.js";

const API = process.env.IOT_API_URL || `http://localhost:${process.env.PORT || 3001}/api/v1/iot/readings`;
const INTERVAL_MS = 5000;
const LEAK = process.argv.includes("--leak");

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");
const drift = (value, step, min, max) => Math.min(max, Math.max(min, value + (Math.random() - 0.5) * step));

// Ďalšia hodnota podľa typu, nadväzuje na poslednú.
const NEXT = {
  HUMIDITY_SENSOR: (v) => drift(v ?? 40, 3, 5, 90),
  WATER_LEVEL_SENSOR: (v) => drift(v ?? 60, 2, 0, 100),
  SPRINKLER: (v) => (Math.random() < 0.1 ? 1 - (v ?? 0) : v ?? 0),
  TRIP_SENSOR: () => 0,
  HOME_GATEWAY: () => 1,
  MOWER: (v) => v ?? 0,
  OTHER: (v) => drift(v ?? 0, 1, -100, 100),
};

// Kľúče sa ukladajú len ako hash, preto simulátor demo zariadeniam pridelí nové a drží ich v pamäti.
// Skutočné zariadenia (bez "demo-" v externom ID) nechá na pokoji.
const devices = await prisma.device.findMany({
  where: { externalId: { startsWith: "demo-" }, garden: { deletedAt: null } },
  include: { garden: { select: { street: true, city: true } } },
  orderBy: { externalId: "asc" },
});
if (!devices.length) {
  console.log("Žiadne demo zariadenia. Spusti najprv: npm run demo:reset");
  process.exit(0);
}
for (const d of devices) {
  d.token = crypto.randomBytes(24).toString("base64url");
  await prisma.device.update({ where: { id: d.id }, data: { tokenHash: hashToken(d.token) } });
}
await prisma.$disconnect();

const leakDevice = LEAK ? devices.find((d) => d.type === "TRIP_SENSOR") : null;
const startedAt = Date.now();
console.log(`Simulujem ${devices.length} zariadení, posielam na ${API} každých ${INTERVAL_MS / 1000} s. Koniec: Ctrl+C`);
if (leakDevice) console.log(`Únik vody príde o 15 s: ${leakDevice.name}, ${leakDevice.garden.street}, ${leakDevice.garden.city}`);

async function send(device, value) {
  const response = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Device-Token": device.token },
    body: JSON.stringify({ value }),
  });
  return response.json().catch(() => ({}));
}

async function tick() {
  const leakNow = leakDevice && Date.now() - startedAt > 15000;
  for (const d of devices) {
    const value = d === leakDevice && leakNow ? 1 : Math.round(NEXT[d.type](d.lastValue?.value) * 10) / 10;
    d.lastValue = { value };
    try {
      const result = await send(d, value);
      if (result.requestNumber && !d.reported) {
        d.reported = true;
        console.log(`ÚNIK VODY: ${d.garden.street}, ${d.garden.city}, vznikla požiadavka #${result.requestNumber}`);
      }
    } catch (err) {
      console.error(`Server neodpovedá (${err.message}). Beží npm run dev?`);
      return;
    }
  }
  console.log(`${new Date().toLocaleTimeString("sk-SK")} odoslané hodnoty z ${devices.length} zariadení`);
}

await tick();
setInterval(tick, INTERVAL_MS);
