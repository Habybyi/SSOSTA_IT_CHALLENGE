import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";
import { hashPassword } from "../src/lib/password.js";

// Vytvorí prvý účet majiteľa a predvolené nastavenia. Dá sa spustiť opakovane.
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
    "company.slogan": "Kráľovský trávnik bez starostí",
    "company.phone": "+421 900 123 456",
    "company.email": "milan.kovac@custodia.sk",
    "company.address": "Ul. 29. augusta 4812, 058 01 Poprad",
  };
  for (const [key, value] of Object.entries(defaults)) {
    await prisma.setting.upsert({ where: { key }, update: {}, create: { key, value } });
  }

  console.log(`Majiteľ: ${owner.email} (pri prvom prihlásení si zmení heslo)`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
