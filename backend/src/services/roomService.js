import { getPool } from "../config/database.js";

export const getRooms = async () => {
  const pool = getPool();
  const { rows } = await pool.query(
    "SELECT id, name, capacity, default_layout FROM rooms ORDER BY name ASC"
  );
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    capacity: row.capacity,
    defaultLayout: row.default_layout
  }));
};
