import { config } from "./config.js";
import { createApp } from "./app.js";
import { startNotificationWorker } from "./modules/notifications/worker.js";

const app = createApp();
app.listen(config.port, () => {
  console.log(`Custodia API beží na http://localhost:${config.port}/api/v1`);
});

if (config.notificationsWorker) {
  startNotificationWorker();
}
