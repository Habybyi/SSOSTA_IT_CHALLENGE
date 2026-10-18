import { config } from "../../config.js";

// Texty e-mailov. Každá šablóna dostane payload a vráti predmet, text a HTML.
// Zámerne jednoduché HTML bez externých obrázkov, aby sa zobrazilo v každom klientovi.

const BRAND = "#15380a";
const ACCENT = "#4ea537";

const escape = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const layout = (title, bodyHtml) => `<!doctype html>
<html lang="sk"><head><meta charset="UTF-8"><title>${escape(title)}</title></head>
<body style="margin:0;background:#eef3ec;font-family:Arial,Helvetica,sans-serif;color:#2d3a29">
  <div style="max-width:560px;margin:0 auto;padding:24px">
    <div style="background:#ffffff;border-radius:16px;padding:28px">
      <div style="font-size:22px;font-weight:bold;color:${BRAND};letter-spacing:2px">CUSTODIA</div>
      <div style="font-size:11px;color:${ACCENT};letter-spacing:2px;text-transform:uppercase;margin-bottom:20px">Kráľovský trávnik bez starostí</div>
      ${bodyHtml}
    </div>
    <p style="font-size:12px;color:#6f7e69;text-align:center;margin-top:16px">
      Custodia · Ul. 29. augusta 4812, 058 01 Poprad · +421 900 123 456
    </p>
  </div>
</body></html>`;

const p = (text) => `<p style="font-size:15px;line-height:1.5;margin:0 0 14px">${text}</p>`;

export const TEMPLATES = {
  // Zákazníkovi hneď po prijatí požiadavky (rieši problém "požiadavka sa stratí").
  REQUEST_RECEIVED: ({ number, firstName, typeLabel, description }) => ({
    subject: `Prijali sme vašu požiadavku č. ${number}`,
    text: `Dobrý deň${firstName ? ` ${firstName}` : ""},

prijali sme vašu požiadavku č. ${number} (${typeLabel}).
${description ? `\nVáš popis: ${description}\n` : ""}
Ozveme sa vám čo najskôr a dohodneme termín. Pri komunikácii s nami stačí uviesť číslo ${number}.

Tím Custodia`,
    html: layout(
      `Požiadavka č. ${number}`,
      p(`Dobrý deň${firstName ? ` ${escape(firstName)}` : ""},`) +
        p(`prijali sme vašu požiadavku <strong>č. ${number}</strong> (${escape(typeLabel)}).`) +
        (description ? p(`<em>Váš popis:</em> ${escape(description)}`) : "") +
        p("Ozveme sa vám čo najskôr a dohodneme termín. Pri komunikácii s nami stačí uviesť toto číslo.") +
        p("Tím Custodia")
    ),
  }),

  REQUEST_DONE: ({ number, firstName, typeLabel }) => ({
    subject: `Hotovo: požiadavka č. ${number}`,
    text: `Dobrý deň${firstName ? ` ${firstName}` : ""},

vašu požiadavku č. ${number} (${typeLabel}) sme vybavili. Ak by niečo nefungovalo, stačí odpovedať na tento e-mail.

Ďakujeme, tím Custodia`,
    html: layout(
      `Hotovo: požiadavka č. ${number}`,
      p(`Dobrý deň${firstName ? ` ${escape(firstName)}` : ""},`) +
        p(`vašu požiadavku <strong>č. ${number}</strong> (${escape(typeLabel)}) sme vybavili.`) +
        p("Ak by niečo nefungovalo, stačí odpovedať na tento e-mail.") +
        p("Ďakujeme, tím Custodia")
    ),
  }),

  // Majiteľovi, keď príde požiadavka zvonku (web, e-mail), nech nemusí sledovať aplikáciu.
  STAFF_NEW_REQUEST: ({ number, customerName, typeLabel, priorityLabel, sourceLabel, requestId }) => {
    const url = `${config.appUrl}/requests/${requestId}`;
    return {
      subject: `Nová požiadavka č. ${number}: ${typeLabel} (${customerName})`,
      text: `Nová požiadavka č. ${number}
Zákazník: ${customerName}
Typ: ${typeLabel}
Priorita: ${priorityLabel}
Zdroj: ${sourceLabel}

Otvoriť: ${url}`,
      html: layout(
        `Nová požiadavka č. ${number}`,
        p(`<strong>Nová požiadavka č. ${number}</strong>`) +
          p(
            `Zákazník: ${escape(customerName)}<br>Typ: ${escape(typeLabel)}<br>Priorita: ${escape(priorityLabel)}<br>Zdroj: ${escape(sourceLabel)}`
          ) +
          `<a href="${url}" style="display:inline-block;background:${ACCENT};color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:bold">Otvoriť požiadavku</a>`
      ),
    };
  },
};

export function renderTemplate(name, payload) {
  const template = TEMPLATES[name];
  if (!template) throw new Error(`Neznáma šablóna e-mailu: ${name}`);
  return template(payload || {});
}
