const SOURCES = [
  ["Google", 0.46],
  ["Priamo", 0.22],
  ["Facebook", 0.16],
  ["Instagram", 0.1],
  ["zahradkari.sk", 0.04],
  ["Seznam", 0.02],
];

const pickSource = (r) => {
  let sum = 0;
  for (const [name, share] of SOURCES) {
    sum += share;
    if (r < sum) return name;
  }
  return "Priamo";
};

const seeded = (seed) => () => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
};

export async function createDemoWebEvents(prisma, now = new Date()) {
  if ((await prisma.webEvent.count()) > 0) return 0;
  const rand = seeded(42);
  const rows = [];
  for (let daysAgo = 89; daysAgo >= 0; daysAgo--) {
    const day = new Date(now.getTime() - daysAgo * 24 * 3600 * 1000);
    const weekend = day.getDay() === 0 || day.getDay() === 6;
    const autumn = daysAgo < 40 ? 1.35 : 1;
    const visits = Math.round((weekend ? 34 : 24) * autumn + rand() * 14);
    for (let v = 0; v < visits; v++) {
      const at = new Date(day);
      at.setHours(7 + Math.floor(rand() * 15), Math.floor(rand() * 60), 0, 0);
      if (at > now) continue;
      const source = pickSource(rand());
      rows.push({ type: "page_view", source, createdAt: at });
      if (rand() < 0.31) {
        rows.push({ type: "calc_start", source, createdAt: at });
        if (rand() < 0.68) {
          rows.push({ type: "calc_complete", source, createdAt: at });
          if (rand() < 0.17) rows.push({ type: "lead_submit", source, createdAt: at });
        }
      }
      if (rand() < 0.035) rows.push({ type: "service_submit", source, createdAt: at });
      if (rand() < 0.06) rows.push({ type: "chat_message", source, createdAt: at });
    }
  }
  await prisma.webEvent.createMany({ data: rows });
  return rows.length;
}
