// Prvé spustenie jedným príkazom: npm run setup
// Pripraví .env, spustí databázu v Dockeri, nainštaluje balíčky, vytvorí tabuľky a ukážkové dáta.
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import crypto from "node:crypto";

const withDemo = !process.argv.includes("--no-demo");
const run = (cmd, opts = {}) => {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { stdio: "inherit", ...opts });
};

try {
  execSync("docker info", { stdio: "ignore" });
} catch {
  console.error("Docker nebeží. Spusti Docker Desktop a skús znova.");
  process.exit(1);
}

if (!existsSync("server/.env")) {
  const secret = () => crypto.randomBytes(32).toString("hex");
  const env = readFileSync("server/.env.example", "utf8")
    .replace("JWT_SECRET=zmen-ma", `JWT_SECRET=${secret()}`)
    .replace("INBOUND_EMAIL_SECRET=zmen-ma", `INBOUND_EMAIL_SECRET=${secret()}`);
  writeFileSync("server/.env", env);
  console.log("Vytvorený server/.env s náhodnými tajnými kľúčmi.");
}

run("docker compose up -d --wait");
run("npm install");
run("npm install", { cwd: "server" });
run("npm install", { cwd: "client" });
run("npx prisma migrate deploy", { cwd: "server" });
run("npm run db:seed", { cwd: "server" });
if (withDemo) run("npm run db:demo", { cwd: "server" });

console.log(`
Hotovo. Spusti aplikáciu:  npm run dev
  Aplikácia:  http://localhost:5173
  E-maily:    http://localhost:8025 (Mailpit)
  Majiteľ:    milan.kovac@custodia.sk / ZmenMa123! (pri prvom prihlásení si zmení heslo)
  Brigádnik:  peter.brigadnik@custodia.sk / Brigadnik123${withDemo ? "" : " (len s demo dátami)"}
`);
