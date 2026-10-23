import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";
import { hashPassword } from "../src/lib/password.js";
import { normalizePhone } from "../src/lib/phone.js";
import { demoGps } from "./demoGps.js";
import { createDemoDevices } from "./demoIot.js";

// Ukážkové dáta na prezentáciu: 15 stálych zákazníkov ako v zadaní, ich záhrady,
// história zásahov za posledné roky, otvorené požiadavky a termíny na tento týždeň.
// Dátumy sa počítajú od dnes, takže demo vyzerá vždy aktuálne.
//
//   npm run db:demo              pridá demo (existujúce dáta nechá, rovnakých zákazníkov nepridá dvakrát)
//   npm run db:demo -- --reset   najprv ZMAŽE zákazníkov, požiadavky a termíny (používatelia, materiál a nastavenia ostanú)

const RESET = process.argv.includes("--reset");

const now = new Date();
const day = (offset, hour = 8, minute = 0) => {
  const d = new Date(now);
  d.setDate(d.getDate() + offset);
  d.setHours(hour, minute, 0, 0);
  return d;
};
const yearsAgo = (years, month, dayOfMonth) => new Date(now.getFullYear() - years, month - 1, dayOfMonth, 9, 0);

// Najbližší pracovný deň (po až so) od posunu, aby demo termíny nepadli na nedeľu.
const workday = (offset, hour, minute = 0) => {
  let d = day(offset, hour, minute);
  while (d.getDay() === 0) d = new Date(d.getTime() + 24 * 3600 * 1000);
  return d;
};

const CUSTOMERS = [
  { first: "Ján", last: "Hudák", phone: "0905 301 101", email: "jan.hudak@example.sk", street: "Levočská 14", city: "Poprad", zones: 4, year: 2021, smart: false, water: "WELL", notes: "Pes na dvore, zvoniť vopred." },
  { first: "Mária", last: "Kollárová", phone: "0905 301 102", email: "maria.kollarova@example.sk", street: "Štefánikova 52", city: "Poprad", zones: 3, year: 2022, smart: true, water: "MAINS" },
  { first: "Peter", last: "Švec", phone: "0905 301 103", email: "peter.svec@example.sk", street: "Hviezdoslavova 8", city: "Svit", zones: 5, year: 2023, smart: true, water: "WELL", company: "Penzión Pod Tatrami" },
  { first: "Zuzana", last: "Bednárová", phone: "0905 301 104", email: "zuzana.bednarova@example.sk", street: "Mierová 21", city: "Svit", zones: 2, year: 2021, smart: false, water: "MAINS" },
  { first: "Martin", last: "Oravec", phone: "0905 301 105", email: "martin.oravec@example.sk", street: "Hlavné námestie 33", city: "Kežmarok", zones: 6, year: 2024, smart: true, water: "WELL" },
  { first: "Lucia", last: "Vargová", phone: "0905 301 106", email: "lucia.vargova@example.sk", street: "Nižná brána 4", city: "Kežmarok", zones: 3, year: 2022, smart: false, water: "MAINS", notes: "Kľúč od šachty u suseda (č. 6)." },
  { first: "Tomáš", last: "Lacko", phone: "0905 301 107", email: "tomas.lacko@example.sk", street: "Sobotské námestie 12", city: "Spišská Sobota", zones: 4, year: 2025, smart: true, water: "RAINWATER" },
  { first: "Eva", last: "Krajčírová", phone: "0905 301 108", email: "eva.krajcirova@example.sk", street: "Tatranská 70", city: "Veľká Lomnica", zones: 5, year: 2023, smart: false, water: "WELL" },
  { first: "Jozef", last: "Kováčik", phone: "0905 301 109", email: "jozef.kovacik@example.sk", street: "Kežmarská 3", city: "Veľká Lomnica", zones: 2, year: 2021, smart: false, water: "MAINS" },
  { first: "Andrea", last: "Polláková", phone: "0905 301 110", email: "andrea.pollakova@example.sk", street: "Hlavná 41", city: "Batizovce", zones: 3, year: 2024, smart: true, water: "WELL" },
  { first: "Michal", last: "Gavalier", phone: "0905 301 111", email: "michal.gavalier@example.sk", street: "Popradská 9", city: "Stará Lesná", zones: 4, year: 2022, smart: true, water: "WELL", company: "Hotel Lesná" },
  { first: "Katarína", last: "Dudová", phone: "0905 301 112", email: "katarina.dudova@example.sk", street: "Jarná 16", city: "Poprad", zones: 2, year: 2026, smart: true, water: "MAINS" },
  { first: "Róbert", last: "Novotný", phone: "0905 301 113", email: "robert.novotny@example.sk", street: "Okružná 27", city: "Poprad", zones: 3, year: 2021, smart: false, water: "MAINS", notes: "Starý systém, iné ventily (Rain Bird)." },
  { first: "Simona", last: "Hrušovská", phone: "0905 301 114", email: "simona.hrusovska@example.sk", street: "Družstevná 5", city: "Svit", zones: 3, year: 2025, smart: true, water: "MAINS" },
  { first: "Pavol", last: "Mráz", phone: "0905 301 115", email: "pavol.mraz@example.sk", street: "Slnečná 2", city: "Kežmarok", zones: 4, year: 2023, smart: false, water: "WELL" },
];

const ZONE_TEMPLATES = [
  { name: "Predná záhrada", areaType: "LAWN", irrigationType: "SPRINKLER", sprinklerType: "Rotačný", sprinklerBrand: "Hunter PGP", sprinklerCount: 6, valveLocation: "šachta pri bráne" },
  { name: "Zadný trávnik", areaType: "LAWN", irrigationType: "SPRINKLER", sprinklerType: "Rotačný", sprinklerBrand: "Hunter PGP", sprinklerCount: 8, valveLocation: "šachta pri bráne" },
  { name: "Záhony pri terase", areaType: "BED", irrigationType: "DRIP", sprinklerType: "Kvapková hadica 16 mm", sprinklerCount: 40, valveLocation: "šachta pri terase" },
  { name: "Bočný pás", areaType: "LAWN", irrigationType: "SPRINKLER", sprinklerType: "Statický", sprinklerBrand: "Rain Bird 1804", sprinklerCount: 5, valveLocation: "šachta pri garáži" },
  { name: "Živý plot", areaType: "HEDGE", irrigationType: "DRIP", sprinklerType: "Kvapková hadica", sprinklerCount: 30, valveLocation: "šachta pri garáži" },
  { name: "Ovocné stromy", areaType: "OTHER", irrigationType: "DRIP", sprinklerType: "Kvapkovače 4 l/h", sprinklerCount: 12, valveLocation: "šachta za domom" },
];

async function reset() {
  console.log("Mažem zákazníkov, požiadavky, termíny a súvisiace záznamy...");
  await prisma.$transaction([
    prisma.workLogMaterial.deleteMany(),
    prisma.photo.deleteMany(),
    prisma.workLog.deleteMany(),
    prisma.appointment.deleteMany(),
    prisma.requestStatusChange.deleteMany(),
    prisma.serviceRequest.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.device.deleteMany(),
    prisma.zone.deleteMany(),
    prisma.garden.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.user.deleteMany({ where: { role: "CUSTOMER" } }),
    prisma.customer.deleteMany(),
    prisma.dayCapacity.deleteMany(),
  ]);
}

async function main() {
  // Na serveri sa demo nahrá len do prázdnej databázy, pri každom reštarte by inak dopĺňalo dáta.
  if (process.env.DEMO_ONLY_IF_EMPTY === "true" && !RESET && (await prisma.customer.count()) > 0) {
    console.log("Demo preskočené: databáza už obsahuje zákazníkov.");
    return;
  }
  if (RESET) await reset();

  const owner = await prisma.user.findFirst({ where: { role: "OWNER", isActive: true }, orderBy: { createdAt: "asc" } });
  if (!owner) throw new Error("Najprv spusti npm run db:seed (chýba účet majiteľa).");

  // Brigádnik s heslom zo .env (alebo predvoleným), aby sa dal na prezentácii ukázať aj jeho pohľad.
  const techEmail = (process.env.DEMO_TECH_EMAIL || "peter.brigadnik@custodia.sk").toLowerCase();
  const tech = await prisma.user.upsert({
    where: { email: techEmail },
    update: {},
    create: {
      email: techEmail,
      name: "Peter Brigádnik",
      phone: "+421 905 400 400",
      role: "TECHNICIAN",
      passwordHash: await hashPassword(process.env.DEMO_TECH_PASSWORD || "Brigadnik123"),
      mustChangePassword: false,
    },
  });

  const materials = await prisma.material.findMany();
  const material = (sku) => materials.find((m) => m.sku === sku);

  let created = 0;
  const customers = [];
  for (const c of CUSTOMERS) {
    const existing = await prisma.customer.findFirst({ where: { email: c.email, deletedAt: null } });
    if (existing) {
      customers.push({ ...c, record: existing, garden: await prisma.garden.findFirst({ where: { customerId: existing.id } }) });
      continue;
    }
    const record = await prisma.customer.create({
      data: {
        firstName: c.first,
        lastName: c.last,
        companyName: c.company || null,
        phone: c.phone,
        phoneNormalized: normalizePhone(c.phone),
        email: c.email,
        status: "ACTIVE",
        source: created % 3 === 0 ? "REFERRAL" : "PHONE",
        serviceReminders: true,
        createdAt: yearsAgo(now.getFullYear() - c.year, 4, 10 + (created % 15)),
      },
    });
    const garden = await prisma.garden.create({
      data: {
        customerId: record.id,
        street: c.street,
        city: c.city,
        ...demoGps(c.city, created),
        areaM2: 300 + c.zones * 110,
        waterSource: c.water,
        waterPressureBar: c.water === "WELL" ? 3.2 : 4.5,
        flowRateLpm: c.water === "WELL" ? 35 : 45,
        mainValveLocation: "v garáži vľavo",
        controllerModel: c.smart ? "Hunter Pro-HC (Wi-Fi)" : "Hunter X-Core",
        controllerLocation: "garáž",
        isSmartController: c.smart,
        hasRainSensor: c.smart,
        installedYear: c.year,
        systemVersion: c.year <= 2022 ? "v1 (prvé roky, iné ventily)" : "v2",
        notes: c.notes || null,
        zones: {
          create: ZONE_TEMPLATES.slice(0, c.zones).map((z, i) => ({ ...z, number: i + 1, areaM2: z.areaType === "LAWN" ? 120 : 40 })),
        },
      },
    });

    if (c.smart) await createDemoDevices(prisma, garden, c, created);

    // História: každá sezóna od inštalácie (jarné spustenie a zazimovanie).
    for (let year = c.year; year < now.getFullYear(); year++) {
      const ago = now.getFullYear() - year;
      if (year > c.year) {
        await prisma.workLog.create({
          data: {
            gardenId: garden.id,
            technicianId: owner.id,
            performedAt: yearsAgo(ago, 4, 8 + (created % 10)),
            durationMin: 60,
            description: `Jarné spustenie, kontrola všetkých ${c.zones} zón, nastavenie programu.`,
          },
        });
      }
      await prisma.workLog.create({
        data: {
          gardenId: garden.id,
          technicianId: owner.id,
          performedAt: yearsAgo(ago, 10, 10 + (created % 12)),
          durationMin: 50,
          description: `Zazimovanie: vyfúkanie ${c.zones} zón kompresorom, vypnutá jednotka.`,
          materials: material("BAT-9V") ? { create: [{ materialId: material("BAT-9V").id, quantity: 1, unitPrice: material("BAT-9V").unitPrice }] } : undefined,
        },
      });
    }
    customers.push({ ...c, record, garden });
    created += 1;
  }

  // Zákaznícky portál: jedna smart záhrada so senzormi má hotový prístup na ukážku.
  const portalEmail = (process.env.DEMO_CUSTOMER_EMAIL || "maria.kollarova@example.sk").toLowerCase();
  const portalCustomer = customers.find((c) => c.email === portalEmail)?.record;
  if (portalCustomer && !(await prisma.user.findUnique({ where: { email: portalEmail } }))) {
    await prisma.user.create({
      data: {
        email: portalEmail,
        name: `${portalCustomer.firstName} ${portalCustomer.lastName}`,
        phone: portalCustomer.phone,
        role: "CUSTOMER",
        customerId: portalCustomer.id,
        passwordHash: await hashPassword(process.env.DEMO_CUSTOMER_PASSWORD || "Zakaznik123"),
        mustChangePassword: false,
      },
    });
  }

  // Požiadavky a termíny vytvárame len pri prvom pridaní dema.
  const hasDemoRequests = await prisma.serviceRequest.count({ where: { customerId: { in: customers.map((c) => c.record.id) } } });
  if (!hasDemoRequests) {
    const byLast = (last) => customers.find((c) => c.last === last);
    const createRequest = async (c, { type, priority = "NORMAL", status = "NEW", source = "PHONE", title, description, createdAgoHours = 2, payload }) => {
      const createdAt = new Date(now.getTime() - createdAgoHours * 3600 * 1000);
      const statusChanges = [{ toStatus: "NEW", note: "Prijaté", createdAt }];
      if (status !== "NEW") statusChanges.push({ fromStatus: "NEW", toStatus: status, changedById: owner.id, createdAt: new Date(createdAt.getTime() + 3600 * 1000) });
      return prisma.serviceRequest.create({
        data: {
          customerId: c.record.id,
          gardenId: c.garden.id,
          type,
          priority,
          status,
          source,
          title,
          description,
          payload,
          createdAt,
          createdById: owner.id,
          assignedToId: status === "NEW" ? null : tech.id,
          closedAt: ["DONE", "CLOSED"].includes(status) ? new Date() : null,
          statusChanges: { create: statusChanges },
        },
      });
    };
    const appointment = (request, c, startsAt, minutes, status = "CONFIRMED", technicianId = tech.id) =>
      prisma.appointment.create({
        data: {
          serviceRequestId: request.id,
          gardenId: c.garden.id,
          technicianId,
          startsAt,
          endsAt: new Date(startsAt.getTime() + minutes * 60000),
          status,
        },
      });

    // Havária a nová porucha: navrchu zoznamu.
    await createRequest(byLast("Švec"), {
      type: "FAULT",
      priority: "EMERGENCY",
      title: "Tečie voda zo šachty pri penzióne",
      description: "Od rána uniká voda v šachte pri bráne, hostia si sťažujú na mokrý chodník.",
      createdAgoHours: 1,
    });
    await createRequest(byLast("Novotný"), {
      type: "FAULT",
      priority: "HIGH",
      source: "EMAIL",
      title: "Nefunguje zóna 2",
      description: "Zóna 2 sa nespúšťa, ostatné idú. Starý systém z roku 2021.",
      createdAgoHours: 20,
    });

    // Zazimovania naplánované na tento a budúci týždeň (jesenná špička).
    const autumn = [
      ["Hudák", 0, 8], ["Kollárová", 0, 9, 15], ["Bednárová", 1, 8], ["Hrušovská", 1, 9, 15],
      ["Oravec", 2, 8], ["Vargová", 2, 9, 30], ["Mráz", 3, 8], ["Krajčírová", 4, 8], ["Kováčik", 4, 9, 15],
    ];
    for (const [last, offset, hour, minute = 0] of autumn) {
      const c = byLast(last);
      const r = await createRequest(c, { type: "WINTERIZATION", status: "SCHEDULED", title: "Zazimovanie", createdAgoHours: 72 + offset * 5 });
      await appointment(r, c, workday(offset, hour, minute), 60);
    }

    // Obhliadka z kalkulačky na webe (nový dopyt) a rezervácia zo webu bez presného času.
    const lead = await prisma.customer.create({
      data: { firstName: "Veronika", lastName: "Šimková", email: "veronika.simkova@example.sk", status: "LEAD", source: "CALCULATOR" },
    });
    const leadGarden = await prisma.garden.create({ data: { customerId: lead.id, street: "Lipová 11", city: "Poprad" } });
    await createRequest({ record: lead, garden: leadGarden }, {
      type: "INSPECTION",
      source: "CALCULATOR",
      title: "Dopyt z kalkulačky: presná ponuka a obhliadka",
      createdAgoHours: 5,
      payload: { areaM2: 640, lawnM2: 420, bedsM2: 60, zones: 5, priceFrom: 2400, priceTo: 3150, waterSource: "WELL", rainSensor: true, mobileControl: true },
    });
    const pollakova = byLast("Polláková");
    const booking = await createRequest(pollakova, { type: "WINTERIZATION", source: "WEB_FORM", title: "Zazimovanie", createdAgoHours: 30, payload: { preferredDate: "web" } });
    await appointment(booking, pollakova, workday(5, 8), 60, "RESERVED", null);

    // Starostlivosť o trávnik v riešení (treba ešte prísť) a vybavené požiadavky z minulých dní.
    await createRequest(byLast("Gavalier"), {
      type: "LAWN_CARE",
      status: "IN_PROGRESS",
      title: "Jesenná vertikutácia a hnojenie",
      description: "Hotel chce trávnik pripravený na zimu.",
      createdAgoHours: 100,
    });
    for (const last of ["Lacko", "Dudová"]) {
      const c = byLast(last);
      const r = await createRequest(c, { type: "WINTERIZATION", status: "DONE", title: "Zazimovanie", createdAgoHours: 200 });
      const appt = await appointment(r, c, workday(-3, 10), 60, "DONE");
      await prisma.workLog.create({
        data: {
          appointmentId: appt.id,
          serviceRequestId: r.id,
          gardenId: c.garden.id,
          technicianId: tech.id,
          performedAt: appt.startsAt,
          durationMin: 55,
          description: `Zazimovanie: vyfúkané všetky zóny, jednotka vypnutá.`,
        },
      });
    }
  }

  const counts = {
    zákazníci: await prisma.customer.count({ where: { deletedAt: null } }),
    požiadavky: await prisma.serviceRequest.count(),
    termíny: await prisma.appointment.count(),
  };
  console.log(`Demo pripravené (${created} nových zákazníkov).`, counts);
  console.log(`Brigádnik: ${techEmail} (heslo z DEMO_TECH_PASSWORD, predvolene Brigadnik123)`);
  console.log(`Zákaznícky portál: ${portalEmail} (heslo z DEMO_CUSTOMER_PASSWORD, predvolene Zakaznik123)`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
