// Každá požiadavka na API do terminálu: čas, metóda, cesta, výsledok, trvanie.
// Telo požiadavky sa nevypisuje, aby sa do logu nedostali heslá.
export function requestLogger(req, res, next) {
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    const time = new Date().toLocaleTimeString("sk-SK", { timeZone: process.env.APP_TIMEZONE || "Europe/Bratislava" });
    const who = req.user ? ` ${req.user.email ?? req.user.id}` : "";
    const path = req.originalUrl.split("?")[0];
    console.log(`${time} ${req.method} ${path} ${res.statusCode} ${ms.toFixed(0)} ms${who}`);
  });
  next();
}
