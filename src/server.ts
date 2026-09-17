import { db } from "./db/index.js";
import { createApp } from "./app.js";

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
const app = createApp(db);

app.listen(port, () => {
  console.log(`habit-tracker listening on http://localhost:${port}`);
});
