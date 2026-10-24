import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";
import { hashPassword } from "../src/lib/password.js";

async function main() {
  const email = (process.env.SEED_OWNER_EMAIL || "milan.kovac@custodia.sk").toLowerCase();
  const password = process.env.SEED_OWNER_PASSWORD || "ZmenMa123!";

  const owner = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: process.env.SEED_OWNER_NAME || "Milan Kováč",
      role: "OWNER",
      passwordHash: await hashPassword(password),
      mustChangePassword: true,
    },
  });

  const defaults = {
    "capacity.defaultVisitsPerDay": 6,
    "company.name": "Custodia",
    "company.slogan": "Kráľovsky bez starostí",
    "company.phone": "+421 900 123 456",
    "company.email": "milan.kovac@custodia.sk",
    "company.address": "Ul. 29. augusta 4812, 058 01 Poprad",
  };
  for (const [key, value] of Object.entries(defaults)) {
    await prisma.setting.upsert({ where: { key }, update: {}, create: { key, value } });
  }

  const materials = [
    { sku: "TRY-STA", name: "Statická tryska (náhradná)", unit: "ks", unitPrice: 4.5, stockQty: 40, minStock: 10 },
    { sku: "TRY-ROT", name: "Rotačná tryska Hunter", unit: "ks", unitPrice: 12.9, stockQty: 15, minStock: 5 },
    { sku: "POST-STA", name: "Výsuvný postrekovač statický", unit: "ks", unitPrice: 7.9, stockQty: 20, minStock: 5 },
    { sku: "POST-ROT", name: "Rotačný postrekovač Hunter PGP", unit: "ks", unitPrice: 18.5, stockQty: 12, minStock: 4 },
    { sku: "VENT-24", name: "Elektromagnetický ventil 24 V", unit: "ks", unitPrice: 32, stockQty: 6, minStock: 2 },
    { sku: "CIEVKA-24", name: "Cievka ventilu 24 V", unit: "ks", unitPrice: 14, stockQty: 8, minStock: 3 },
    { sku: "TES-SADA", name: "Sada tesnení a O-krúžkov", unit: "sada", unitPrice: 3.5, stockQty: 25, minStock: 8 },
    { sku: "SPOJ-25", name: "Spojka PE 25 mm", unit: "ks", unitPrice: 2.2, stockQty: 60, minStock: 15 },
    { sku: "HAD-25", name: "PE hadica 25 mm", unit: "m", unitPrice: 0.95, stockQty: 200, minStock: 50 },
    { sku: "KVAP-16", name: "Kvapková hadica 16 mm", unit: "m", unitPrice: 0.6, stockQty: 300, minStock: 50 },
    { sku: "KON-VOD", name: "Vodotesný konektor vodičov", unit: "ks", unitPrice: 1.2, stockQty: 50, minStock: 15 },
    { sku: "BAT-9V", name: "Batéria 9 V do riadiacej jednotky", unit: "ks", unitPrice: 3.9, stockQty: 10, minStock: 4 },
    { sku: "HNOJ-JES", name: "Jesenné hnojivo na trávnik 25 kg", unit: "vrece", unitPrice: 39, stockQty: 6, minStock: 2 },
    { sku: "OSIVO", name: "Trávne osivo (dosev)", unit: "kg", unitPrice: 8.5, stockQty: 20, minStock: 5 },
  ];
  for (const m of materials) {
    await prisma.material.upsert({ where: { sku: m.sku }, update: {}, create: m });
  }
  const bySku = Object.fromEntries((await prisma.material.findMany({ select: { id: true, sku: true } })).map((m) => [m.sku, m.id]));
  const templates = [
    ["WINTERIZATION", "BAT-9V", 1, false],
    ["WINTERIZATION", "TES-SADA", 1, false],
    ["WINTERIZATION", "KON-VOD", 1, true],
    ["SPRING_START", "TRY-STA", 1, true],
    ["SPRING_START", "TES-SADA", 1, false],
    ["SPRING_START", "SPOJ-25", 2, false],
    ["SPRING_START", "BAT-9V", 1, false],
    ["FAULT", "VENT-24", 1, false],
    ["FAULT", "CIEVKA-24", 1, false],
    ["FAULT", "SPOJ-25", 4, false],
    ["FAULT", "HAD-25", 5, false],
    ["FAULT", "TES-SADA", 1, false],
    ["LAWN_CARE", "HNOJ-JES", 1, false],
    ["LAWN_CARE", "OSIVO", 2, false],
  ];
  for (const [requestType, sku, quantity, perZone] of templates) {
    if (!bySku[sku]) continue;
    await prisma.materialTemplate.upsert({
      where: { requestType_materialId: { requestType, materialId: bySku[sku] } },
      update: {},
      create: { requestType, materialId: bySku[sku], quantity, perZone },
    });
  }

  console.log(`Majiteľ: ${owner.email} (pri prvom prihlásení si zmení heslo)`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
