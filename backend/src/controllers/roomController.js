import * as roomService from "../services/roomService.js";

export const listRooms = async (_req, res, next) => {
  try {
    const rooms = await roomService.getRooms();
    res.json({ rooms });
  } catch (error) {
    next(error);
  }
};
