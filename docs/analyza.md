# Analýza: problémy firmy a funkcie systému

Systém nahrádza Milanov zošit a súkromný mobil. Každý problém z príbehu firmy má priradenú funkciu a rolu, ktorá ju používa.

## Roly

| Rola | Kto to je | Čo v systéme robí |
|---|---|---|
| **Majiteľ** (`OWNER`) | Milan Kováč | Vidí všetko, spravuje zákazníkov, tím, plánuje termíny, nastavuje kapacitu a materiál |
| **Technik** (`TECHNICIAN`) | Brigádnik, neskôr ďalší zamestnanci | Vidí svoje výjazdy, kartu záhrady, checklist materiálu, zapisuje vykonanú prácu |
| **Zákazník** (`CUSTOMER`) | Majiteľ záhrady | Nahlási poruchu, rezervuje si termín, vidí stav svojich požiadaviek (portál) |

## Problém → funkcia → rola

| # | Problém z príbehu | Funkcia systému | Rola | Fáza |
|---|---|---|---|---|
| P1 | Zákazníci volajú na súkromný mobil počas Milanovej práce | Jednotný príjem požiadaviek: web formulár, e-mail, ručné zadanie, portál | Zákazník, Majiteľ | 2 |
| P2 | Požiadavky v zošite sa strácajú | Evidencia požiadaviek so stavmi, prioritou a históriou zmien. Nič sa nemaže, len uzatvára | Majiteľ | 2 |
| P3 | Na jar a na jeseň chcú všetci naraz | Rezervácia termínov cez sloty, kapacita na deň, zoskupenie výjazdov podľa obce | Zákazník, Majiteľ | 3 |
| P4 | Milan si nepamätá typ postrekovačov a počet zón | Technická karta záhrady: zóny, postrekovače, riadiaca jednotka, ventily, zdroj vody, fotky | Majiteľ, Technik | 1 |
| P5 | Systémy z prvých rokov sú postavené inak | Rok inštalácie a verzia systému v karte, história všetkých zásahov | Majiteľ, Technik | 1 |
| P6 | Brigádnik ide bez materiálu a musí sa vracať | Pred výjazdom karta záhrady + checklist materiálu podľa typu zásahu a počtu zón | Technik | 4 |
| P7 | Brigádnik nie je vždy k dispozícii | Priradenie výjazdu konkrétnemu technikovi, kalendár tímu | Majiteľ | 3 |
| P8 | Zákazníci môžu byť nespokojní | Automatické potvrdenie, pripomienka termínu, sezónna pripomienka zazimovania | Zákazník | 2, 4 |
| P9 | Milan potrebuje istotu, že ho firma uživí | Výkaz práce a materiálu, prehľad tržieb a zákaziek | Majiteľ | 4, 6 |
| P10 | Milan nie je informatik | Jednoduché rozhranie, veľké tlačidlá, mobil ako prvý, žiadny IT žargón | Všetci | priebežne |

## Mimo rozsah (zatiaľ)

- Napojenie na web firmy (kalkulačka, formuláre). Web ešte neexistuje, API na príjem požiadaviek je ale navrhnuté tak, aby ho web neskôr len zavolal.
