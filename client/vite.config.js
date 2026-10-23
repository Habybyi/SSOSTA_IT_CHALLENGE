import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Jedna adresa pre všetko: "/" je web firmy (index.html), ostatné stránky bez prípony
// (/login, /dashboard, /portal...) sú CRM aplikácia (app.html).
const crmFallback = () => {
  const rewrite = (req, res, next) => {
    const path = req.url.split("?")[0];
    const isPage = req.method === "GET" && path !== "/" && !path.includes(".") && req.headers.accept?.includes("text/html");
    const isInternal = /^\/(api|@|src|node_modules|web|brand)\b/.test(path);
    if (isPage && !isInternal) req.url = "/app.html";
    next();
  };
  return {
    name: "custodia-crm-fallback",
    // Blok bez návratovej hodnoty: vrátená funkcia by sa vo Vite spustila ako ďalší middleware.
    configureServer(server) {
      server.middlewares.use(rewrite);
    },
    configurePreviewServer(server) {
      server.middlewares.use(rewrite);
    },
  };
};

export default defineConfig({
  plugins: [react(), crmFallback()],
  appType: "mpa",
  server: {
    port: 5173,
    proxy: { "/api": "http://localhost:3001" },
  },
  preview: {
    proxy: { "/api": "http://localhost:3001" },
  },
  build: {
    rollupOptions: {
      input: { web: "index.html", crm: "app.html" },
    },
  },
});
