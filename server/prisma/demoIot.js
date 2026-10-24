const STEP_MIN = 30;

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const round = (v) => Math.round(v * 10) / 10;

const SERIES = {
  HUMIDITY_SENSOR: (hourOfDay, dry) => clamp((dry ? 22 : 42) + (hourOfDay >= 5 && hourOfDay < 9 ? 12 : 0) - (hourOfDay > 12 && hourOfDay < 19 ? 9 : 0) + Math.sin(hourOfDay) * 2, 5, 90),
  WATER_LEVEL_SENSOR: (hourOfDay) => clamp(64 - (hourOfDay >= 5 && hourOfDay < 7 ? 8 : 0) + Math.cos(hourOfDay / 3) * 3, 0, 100),
  SPRINKLER: (hourOfDay) => (hourOfDay === 5 || hourOfDay === 20 ? 1 : 0),
  TRIP_SENSOR: () => 0,
  HOME_GATEWAY: () => 1,
};

export const demoDevicesFor = (c) => [
  { type: "HOME_GATEWAY", name: "Brána záhrady (Wi-Fi)" },
  { type: "HUMIDITY_SENSOR", name: "Vlhkosť pôdy: trávnik" },
  { type: "SPRINKLER", name: "Postrekovače: zóna 1" },
  { type: "TRIP_SENSOR", name: "Senzor úniku: šachta" },
  ...(c.water === "WELL" ? [{ type: "WATER_LEVEL_SENSOR", name: "Hladina vody v studni" }] : []),
];

export async function createDemoDevices(prisma, garden, c, index, now = new Date()) {
  const existing = await prisma.device.count({ where: { gardenId: garden.id, externalId: { startsWith: "demo-" } } });
  if (existing) return 0;
  const dry = index % 5 === 1;
  for (const [i, d] of demoDevicesFor(c).entries()) {
    const readings = [];
    for (let t = 24 * 60; t >= 0; t -= STEP_MIN) {
      const at = new Date(now.getTime() - t * 60000);
      readings.push({ value: round(SERIES[d.type](at.getHours(), dry)), recordedAt: at });
    }
    const last = readings[readings.length - 1];
    await prisma.device.create({
      data: {
        gardenId: garden.id,
        type: d.type,
        name: d.name,
        externalId: `demo-${index}-${i}`,
        lastValue: { value: last.value },
        lastSeenAt: last.recordedAt,
        readings: { create: readings },
      },
    });
  }
  return demoDevicesFor(c).length;
}
