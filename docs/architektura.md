# Architektúra

## Prehľad

```
client/   React + Vite (mobil first, neumorfický dizajn)
   │  REST /api/v1 (JSON, JWT v hlavičke Authorization)
server/   Node + Express 5
   │  Prisma ORM
PostgreSQL 16 (Docker)
```

## Vrstvy na serveri

Každá oblasť (`auth`, `users`, neskôr `customers`, `requests`...) je samostatný modul v `server/src/modules/`:

| Súbor | Úloha |
|---|---|
| `*.routes.js` | HTTP: čo príde a čo sa vráti. Žiadna logika |
| `*.service.js` | Pravidlá firmy, validácia (zod), audit |
| Prisma | Prístup k databáze |

Vďaka tomu sa dá vymeniť napríklad spôsob odosielania notifikácií bez zmeny routes.

## Rozhodnutia kvôli škálovateľnosti

| Rozhodnutie | Prečo |
|---|---|
| Celá dátová schéma navrhnutá vo Fáze 0 | Ďalšie fázy len pridávajú obrazovky a endpointy, vzťahy v DB sa neprestavujú |
| PostgreSQL namiesto SQLite/MongoDB | Dáta sú silno prepojené (zákazník → záhrada → zóny → zásahy), viac technikov naraz zapisuje |
| UUID ako ID, číslo požiadavky zvlášť | Bezpečné pre API, zákazník dostane čitateľné "požiadavka č. 42" |
| API pod `/api/v1` | Neskoršia v2 nerozbije starých klientov (napr. mobilnú appku) |
| Stránkovanie v každom zozname | Funguje rovnako pri 15 aj 1500 zákazníkoch |
| Používateľ ≠ zákazník, ale sú prepojené | Portál pre zákazníka (bonus) je len nová obrazovka |
| GPS pri adrese záhrady | Plánovanie podľa lokality a mapa trasy bez zmeny modelu |
| Notifikácie cez tabuľku `Notification` (outbox) | Dnes ich odosiela cron, neskôr sa dá zapojiť fronta (Redis/BullMQ) |
| Fotky cez `storageKey` | Dnes disk, neskôr S3 bez zmeny databázy |
| Soft delete (`deletedAt`) a audit log | Nič sa nestratí, dá sa dohľadať kto čo zmenil |
| Cena materiálu uložená pri použití | Staré výkazy sa nezmenia, keď sa zmení cenník |

## Plánovanie

| Pravidlo | Riešenie |
|---|---|
| Časové pásmo | Všetky dni a časy sa počítajú v `Europe/Bratislava` (`APP_TIMEZONE`), aj cez zmenu letného času |
| Kapacita dňa | Predvolený počet výjazdov z nastavení, výnimky pre konkrétny deň v tabuľke `DayCapacity` |
| Čo zaberá kapacitu | Rezervácie, potvrdené aj hotové termíny |
| Konflikty | Plný deň alebo obsadený technik vráti `409` s kódom, UI ponúkne "Naplánovať aj tak" (`force`) |
| Trvanie zásahu | Podľa typu z nastavení (napr. zazimovanie 60 min), dá sa zmeniť pri termíne |
| Plánovač dňa | Rozloží požiadavky za sebou s rezervou na presun, preskočí obsadené časy technika a to, čo sa nezmestí |

## Notifikácie

```
akcia (nová požiadavka, hotovo)  →  tabuľka Notification (PENDING)  →  worker každých 10 s  →  SMTP
```

- Uloženie požiadavky nikdy nezlyhá kvôli výpadku e-mailu.
- Neúspešné odoslanie sa skúša znova o 1, 4, 9 a 16 minút, potom FAILED.
- Worker si notifikáciu "zarezervuje" podmieneným updatom, takže ani viac bežiacich serverov nepošle e-mail dvakrát.
- V detaile požiadavky je vidno, čo a komu odišlo.

## Bezpečnosť

- Heslá hashované cez bcrypt (12 kôl), nové účty majú dočasné heslo a musia si ho zmeniť.
- Limit pokusov o prihlásenie (10 za 15 minút z jednej IP).
- Používateľ sa pri každej požiadavke načíta z DB, deaktivácia platí okamžite.
- Rovnaká chybová hláška pri zlom e-maile aj hesle.
- Helmet (bezpečnostné HTTP hlavičky), CORS len pre adresu klienta a povolený web firmy.
- Verejný formulár: limit 5 odoslaní za 15 minút, skryté pole proti robotom, povinný súhlas GDPR, verejnosti sa vracia len číslo požiadavky.
- E-mailový webhook chránený tajným kľúčom (porovnanie odolné voči časovým útokom).
