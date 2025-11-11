import dotenv from "dotenv";

dotenv.config();

const requiredVars = ["DB_USER", "DB_PASSWORD", "DB_NAME"];
requiredVars.forEach((key) => {
  if (!process.env[key]) {
    console.warn(`Warning: environment variable ${key} is not set`);
  }
});

export const serverConfig = {
  port: parseInt(process.env.PORT || "4000", 10)
};

export const corsConfig = {
  origin: process.env.CORS_ORIGIN?.split(",") ?? ["http://localhost:3000"],
  credentials: true
};
