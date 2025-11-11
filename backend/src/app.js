import express from "express";
import cors from "cors";
import bookingRoutes from "./routes/bookingRoutes.js";
import roomRoutes from "./routes/roomRoutes.js";
import errorHandler from "./middleware/errorHandler.js";
import { corsConfig } from "./config/env.js";

const app = express();

app.use(cors(corsConfig));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/bookings", bookingRoutes);
app.use("/api/rooms", roomRoutes);

app.use(errorHandler);

export default app;
