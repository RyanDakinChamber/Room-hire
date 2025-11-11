import app from "./app.js";
import { serverConfig } from "./config/env.js";
import { initializePool } from "./config/database.js";

const start = async () => {
  try {
    await initializePool();
    app.listen(serverConfig.port, () => {
      console.log(`Server running on port ${serverConfig.port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

start();
