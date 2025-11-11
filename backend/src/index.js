import app from "./app.js";
import { serverConfig } from "./config/env.js";

app.listen(serverConfig.port, () => {
  console.log(`Server running on port ${serverConfig.port}`);
});
