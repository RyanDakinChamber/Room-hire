import dotenv from "dotenv";

dotenv.config();

export const serverConfig = {
  port: parseInt(process.env.PORT || "4000", 10)
};

export const corsConfig = {
  origin: process.env.CORS_ORIGIN?.split(",") ?? ["http://localhost:3000"],
  credentials: true
};
