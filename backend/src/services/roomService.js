const rooms = [
  { id: 1, name: "Room 1", capacity: 20, defaultLayout: "boardroom" },
  { id: 2, name: "Room 2", capacity: 25, defaultLayout: "boardroom" },
  { id: 3, name: "Room 3", capacity: 30, defaultLayout: "theatre" },
  { id: 4, name: "Room 4", capacity: 30, defaultLayout: "theatre" },
  { id: 5, name: "The Pod", capacity: 8, defaultLayout: "u-shape" },
  { id: 6, name: "Boardroom", capacity: 12, defaultLayout: "boardroom" },
  { id: 7, name: "Members Lounge Room", capacity: 40, defaultLayout: "theatre" }
];

export const getRooms = async () => rooms.map((room) => ({ ...room }));

export const findRoomsByIds = (roomIds) =>
  rooms
    .filter((room) => roomIds.includes(room.id))
    .map((room) => ({ ...room }));
