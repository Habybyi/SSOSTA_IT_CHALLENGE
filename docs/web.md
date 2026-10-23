# Web firmy

Web je hlavná stránka na `http://localhost:5173/`. CRM a zákaznícky portál bežia na tej istej adrese (`/login`), takže všetko je jeden celok a spúšťa sa jedným príkazom `npm run dev`.

## Kde čo je

| Súbor | Čo obsahuje |
|---|---|
| `client/index.html` | obsah webu, SEO (schema LocalBusiness a FAQ) |
| `client/public/ochrana-udajov.html` | ochrana osobných údajov a cookies |
| `client/public/robots.txt`, `sitemap.xml` | SEO, CRM je pre vyhľadávače zakázané |
| `client/public/web/css/` | farby, písmo, svetlá a tmavá téma, sekcie |
| `client/public/web/js/config.js` | všetky nastavenia webu (CRM, GA4, AI) |
| `client/public/web/js/forms.js` | formuláre napojené na CRM |
| `client/public/web/js/calculator.js` | kalkulačka (ceny vo funkcii `result()`) |
| `client/public/web/js/assistant.js` | AI asistent, záložné odpovede (FAQ), hlas |
| `client/public/web/js/analytics.js` | súhlas s cookies, štatistiky, Google mapa |
| `client/public/web/assets/img/` | fotky pred a po (`pred.jpg`, `po.jpg`), kým chýbajú, zobrazí sa náhrada |
| `client/app.html` | vstup do CRM (React) |
| `client/vite.config.js` | `/` je web, ostatné adresy bez prípony sú CRM |

## Napojenie na CRM

| Na webe | Čo vznikne v CRM |
|---|---|
| Kalkulačka, „Odoslať dopyt“ | požiadavka *Obhliadka* zo zdroja *Kalkulačka*, výsledok kalkulácie (zóny, plochy, cena od do) je uložený pri požiadavke |
| Servis, „Nahlásiť poruchu“ | požiadavka *Porucha*, pri zaškrtnutej havárii s prioritou *Havária* |
| Servis, jarné spustenie alebo zazimovanie | požiadavka a **rezervácia dňa** v kalendári, zákazník si vyberá iba z dní s voľnou kapacitou |

Zákazníka CRM spáruje podľa e-mailu alebo telefónu, nového založí ako dopyt. Z ulice a obce vznikne záhrada. Zákazník dostane e-mail s číslom požiadavky, Milan upozornenie na novú požiadavku. Formáty sú v [api-pre-web.md](api-pre-web.md).

Formuláre majú skryté pole proti robotom a CRM obmedzuje počet odoslaní. Osobné údaje sa neukladajú do prehliadača.

## AI asistent

Otázky idú cez CRM server (`/api/v1/public/assistant`), kľúč je len v `server/.env`:

```
GEMINI_API_KEY=tvoj-kluc
GEMINI_MODEL=gemini-3.5-flash-lite
```

Kľúč zadarmo: https://aistudio.google.com/apikey. Bez kľúča asistent odpovedá z pripravených otázok (FAQ v `assistant.js`). Server posiela do AI iba posledných 12 správ a má limit 20 otázok za minútu, aby sa kľúč nedal zneužiť.

Mikrofón funguje v Chrome, Edge a Safari na `localhost` alebo cez https.

## Štatistiky a cookies

- Pätička → **Štatistiky webu** (alebo `?stats` za adresou): lievik kalkulačky, zdroje návštev, otázky AI. Dáta sú z prehliadača a merajú sa len so súhlasom s analytickými cookies.
- Google Analytics 4: meracie ID do `config.js` → `ga4: "G-..."`, načíta sa až po súhlase.
- Lišta cookies: Prijať všetko, Len nevyhnutné, Nastavenia. Google mapa v kontakte sa načíta až po súhlase.
