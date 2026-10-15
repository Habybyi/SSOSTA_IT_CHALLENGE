# Custodia CRM

**Kráľovský trávnik bez starostí.**

Systém na správu zákazníkov a servisu pre firmu Custodia (návrh a inštalácia smart závlahy, sezónny servis, starostlivosť o trávnik). Vznikol v rámci **SSOSTA IT Challenge 2026**, časť *Programovanie: Systém na správu zákazníkov*.

Nahrádza zošit a súkromný mobil majiteľa: žiadna požiadavka sa nestratí, o každej záhrade je jasné, čo je na nej nainštalované, a servis sa dá plánovať vopred.

## Stav

| Fáza | Obsah | Stav |
|---|---|---|
| 0 | Základ: databáza, prihlásenie, roly, správa tímu, dizajn | ✅ |
| 1 | Zákazníci a technická karta záhrady | ⏳ |
| 2 | Servisné požiadavky | ⏳ |
| 3 | Plánovanie a kalendár | ⏳ |
| 4 | Výjazd, materiál a notifikácie | ⏳ |
| 5 | Doladenie (mobil, UX, bezpečnosť, testy) | ⏳ |
| 6 | Bonus (portál zákazníka, prehľady, mapa trasy, IoT) | ⏳ |

## Technológie

React 19 + Vite · Node.js + Express 5 · PostgreSQL 16 + Prisma · Docker Compose

## Spustenie lokálne

Potrebuješ Node.js 20+ a Docker.

```bash
docker compose up -d
```

```bash
cd server && cp .env.example .env && npm install && npx prisma migrate deploy && npm run db:seed && npm run dev
```

```bash
cd client && npm install && npm run dev
```

Aplikácia beží na http://localhost:5173, API na http://localhost:3001/api/v1.

**Prvé prihlásenie:** `milan.kovac@custodia.sk` / `ZmenMa123!` (pri prvom prihlásení si heslo zmeníš). Pred nasadením zmeň `JWT_SECRET` v `server/.env`.

Odoslané e-maily (od Fázy 2) uvidíš v Mailpite na http://localhost:8025.

## Dokumentácia

- [Analýza: problém → funkcia → rola](docs/analyza.md)
- [Architektúra a rozhodnutia](docs/architektura.md)

## Tím

SSOSTA IT Challenge 2026 · Adam Hyben, Marek Skokan, Randy Belačík
