import { app } from "./app.js";
import { connectDB } from "./config/db.js";
import { env } from "./config/env.js";
import { startKeepAlive } from "./utils/keepAlive.js";

await connectDB();

const server = app.listen(env.PORT, () => {
  console.log(`Bachat Nirman API running on port ${env.PORT}`);
});

const stopKeepAlive = env.NODE_ENV === "production" && env.BACKEND_URL
  ? startKeepAlive({ backendUrl: env.BACKEND_URL })
  : () => {};

process.on("SIGTERM", () => {
  stopKeepAlive();
  server.close(() => process.exit(0));
});
