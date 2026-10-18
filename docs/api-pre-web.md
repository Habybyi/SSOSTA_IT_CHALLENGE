# API pre web firmy

Web (kalkulačka, formulár na poruchu, objednanie spustenia alebo zazimovania) posiela dáta do CRM jedným volaním. Netreba prihlásenie.

## Odoslanie požiadavky

`POST /api/v1/public/requests` (JSON)

| Pole | Povinné | Popis |
|---|---|---|
| `source` | nie | `WEB_FORM` (predvolené) alebo `CALCULATOR` |
| `type` | nie | `FAULT`, `SPRING_START`, `WINTERIZATION`, `LAWN_CARE`, `INSTALLATION`, `INSPECTION`, `OTHER`. Kalkulačka má predvolene `INSPECTION` |
| `name` | áno | Meno a priezvisko |
| `phone` / `email` | aspoň jedno | Podľa nich CRM spáruje existujúceho zákazníka |
| `street`, `city`, `postalCode` | nie | Adresa záhrady |
| `description` | nie | Text od zákazníka |
| `payload` | nie | Výsledok kalkulačky, uloží sa tak, ako príde (max. 10 kB) |
| `gdprConsent` | áno | Musí byť `true` |
| `marketingConsent` | nie | Súhlas so zasielaním pripomienok |
| `website` | nie | **Skryté pole proti robotom.** Na webe ho schovaj cez CSS, človek ho nevyplní |

Odporúčané kľúče v `payload` (CRM ich zobrazí s popisom): `areaM2`, `lawnM2`, `bedsM2`, `hedgeM`, `zones`, `priceFrom`, `priceTo`, `waterSource` (`MAINS`/`WELL`), `rainSensor`, `mobileControl`.

### Príklad: kalkulačka

```json
{
  "source": "CALCULATOR",
  "name": "Eva Kráľová",
  "email": "eva@example.sk",
  "street": "Nábrežie 3",
  "city": "Kežmarok",
  "gdprConsent": true,
  "payload": { "areaM2": 620, "zones": 5, "priceFrom": 2400, "priceTo": 3100, "waterSource": "WELL", "rainSensor": true }
}
```

### Odpoveď

`201 { "number": 42 }`: číslo požiadavky, ktoré web ukáže zákazníkovi ("Vaša požiadavka č. 42"). Iné údaje sa nevracajú.

Chyba `400` vráti `{ "error": "...", "fields": { "phone": "Zadaj telefón alebo e-mail." } }`, texty sú po slovensky a dajú sa rovno ukázať pri poli.

### Čo sa stane v CRM

1. Zákazník sa spáruje podľa e-mailu alebo telefónu (`0905 111 222` = `+421905111222`). Neznámy sa založí ako **dopyt** (LEAD).
2. Vznikne požiadavka so stavom *Nová*.
3. Zákazník dostane e-mail s číslom požiadavky, majiteľ dostane upozornenie.

### Obmedzenia

- Max. 5 odoslaní za 15 minút z jednej IP.
- Doménu webu treba povoliť v `WEBSITE_ORIGINS` v `server/.env` (CORS).

## Prichádzajúce e-maily

`POST /api/v1/inbound/email` s hlavičkou `X-Inbound-Secret: <INBOUND_EMAIL_SECRET>`

```json
{ "from": "Peter Malý <peter@example.sk>", "subject": "Nefunguje zóna 2", "text": "Od rána tečie voda pri ventile." }
```

Napojí sa na e-mailovú službu (Mailgun, SendGrid, Postmark), ktorá prijatý e-mail prepošle ako JSON. CRM odhadne typ požiadavky z textu (porucha, zazimovanie, spustenie...) a pri slovách ako "tečie" alebo "havária" zvýši prioritu.
