"use client";

export default function RoomLegend({ rooms }) {
  return (
    <aside
      style={{
        display: "flex",
        gap: "1rem",
        flexWrap: "wrap",
        marginBottom: "1rem",
        background: "white",
        padding: "1rem",
        borderRadius: "8px",
        boxShadow: "0 1px 3px rgba(15, 23, 42, 0.1)"
      }}
    >
      {rooms.map((room) => (
        <div key={room.id} style={{ minWidth: "150px" }}>
          <strong>{room.name}</strong>
          {room.capacity ? <div>Capacity: {room.capacity}</div> : null}
          {room.defaultLayout ? <div>Default: {room.defaultLayout}</div> : null}
        </div>
      ))}
    </aside>
  );
}
