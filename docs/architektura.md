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

## Bezpečnosť

- Heslá hashované cez bcrypt (12 kôl), nové účty majú dočasné heslo a musia si ho zmeniť.
- Limit pokusov o prihlásenie (10 za 15 minút z jednej IP).
- Používateľ sa pri každej požiadavke načíta z DB, deaktivácia platí okamžite.
- Rovnaká chybová hláška pri zlom e-maile aj hesle.
- Helmet (bezpečnostné HTTP hlavičky), CORS len pre adresu klienta.
