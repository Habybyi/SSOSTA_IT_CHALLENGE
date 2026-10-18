# Custodia CRM

**Kráľovský trávnik bez starostí.**

Systém na správu zákazníkov a servisu pre firmu Custodia (návrh a inštalácia smart závlahy, sezónny servis, starostlivosť o trávnik). Vznikol v rámci **SSOSTA IT Challenge 2026**, časť *Programovanie: Systém na správu zákazníkov*.

Nahrádza zošit a súkromný mobil majiteľa: žiadna požiadavka sa nestratí, o každej záhrade je jasné, čo je na nej nainštalované, a servis sa dá plánovať vopred.

## Stav

| Fáza | Obsah | Stav |
|---|---|---|
| 0 | Základ: databáza, prihlásenie, roly, správa tímu, dizajn | ✅ |
| 1 | Zákazníci a technická karta záhrady | ✅ |
| 2 | Servisné požiadavky | ✅ |
| 3 | Plánovanie a kalendár | ✅ |
| 4 | Výjazd, materiál a notifikácie | ⏳ |
| 5 | Doladenie (mobil, UX, bezpečnosť, testy) | ⏳ |
| 6 | Bonus (portál zákazníka, prehľady, mapa trasy, IoT) | ⏳ |

## Čo už vie

- **Prihlásenie a roly:** majiteľ, technik (brigádnik), zákazník. Nové účty majú dočasné heslo.
- **Tím:** majiteľ pridá brigádnika, deaktivuje účet alebo vygeneruje nové heslo.
- **Zákazníci:** vyhľadávanie (meno, telefón, e-mail, adresa), filter podľa stavu a obce, kontakt jedným ťuknutím (zavolať, e-mail).
- **Technická karta záhrady:** zdroj vody, riadiaca jednotka, rok a verzia systému, zóny (postrekovače, ventily), fotky z mobilu, navigácia na adresu.
- **História zásahov:** časová os všetkých zásahov, dá sa do nej prepísať aj stará história zo zošita.
- Upozornenie na starší systém (staršie inštalácie mali iné diely).
- **Servisné požiadavky:** stavy (nová, naplánovaná, v riešení, hotová, uzavretá), priorita s haváriami navrchu, priradenie technikovi, história každej zmeny.
- **Jednotný príjem:** ručne počas telefonátu (nájde zákazníka aj podľa čísla v inom tvare), z webu (formulár, kalkulačka) a z e-mailu. Neznámy človek sa založí ako dopyt.
- **Kalendár:** týždeň výjazdov, kapacita každého dňa (obsadené/max), filter podľa technika. Majiteľ zmení kapacitu dňa jedným klikom (jarná špička viac, dovolenka 0).
- **Plánovanie s kontrolou:** pri termíne vidno, koľko je v ten deň voľných miest a kam sa už ide. Systém upozorní na plný deň alebo obsadeného technika a Milan sa rozhodne, či aj tak.
- **Plánovač sezóny:** nenaplánované zazimovania alebo spustenia zoskupené podľa obce. Vyberie celú obec, deň a technika, systém rozloží časy za sebou aj s presunom.
- **Rezervácie zo webu:** zákazník si vyberie voľný deň, Milan potom potvrdí presný čas. Zrušený termín vráti požiadavku medzi nové, aby sa nestratila.
- **Dnešné výjazdy** na prehľade (technik vidí svoje) s tlačidlami zavolať a navigovať.
- **Potvrdenia e-mailom:** zákazník dostane číslo požiadavky správu s termínom, pri presune alebo zrušení termínu a keď je hotovo. Majiteľ dostane upozornenie na novú požiadavku zvonku.

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
- [API pre web firmy (formulár, kalkulačka, e-maily)](docs/api-pre-web.md)

## Tím

SSOSTA IT Challenge 2026 · Adam Hyben, Marek Skokan, Randy Belačík
