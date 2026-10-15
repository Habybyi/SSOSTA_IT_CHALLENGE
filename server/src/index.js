import { config } from "./config.js";
import { createApp } from "./app.js";

const app = createApp();
app.listen(config.port, () => {
  console.log(`Custodia API beží na http://localhost:${config.port}/api/v1`);
});
