import { Router } from "express";
import { listRooms } from "../controllers/roomController.js";

const router = Router();

router.get("/", listRooms);

export default router;
