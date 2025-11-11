"use client";

import dayjs from "dayjs";

export default function BookingList({ bookings, onEdit, onDelete }) {
  if (!bookings.length) {
    return (
      <section style={{ marginTop: "2rem", background: "white", padding: "1rem", borderRadius: "8px" }}>
        <strong>No bookings for this day.</strong>
      </section>
    );
  }

  return (
    <section
      style={{
        marginTop: "2rem",
        background: "white",
        padding: "1rem",
        borderRadius: "8px",
        boxShadow: "0 1px 4px rgba(15, 23, 42, 0.12)"
      }}
    >
      <h2>Bookings</h2>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {bookings.map((booking) => (
          <li
            key={booking.id}
            style={{
              borderBottom: "1px solid #e2e8f0",
              padding: "0.75rem 0",
              display: "flex",
              justifyContent: "space-between",
              gap: "1rem",
              flexWrap: "wrap"
            }}
          >
            <div>
              <strong>{booking.contactName}</strong> ({booking.attendeeCount} attendees)
              <div>
                {dayjs(booking.startTime).format("HH:mm")} - {dayjs(booking.endTime).format("HH:mm")}
              </div>
              <div>Rooms: {booking.rooms.map((room) => room.name).join(", ")}</div>
              <div>Layout: {booking.layout}</div>
              {booking.refreshments && <div>Refreshments: {booking.refreshmentsDetails || "Yes"}</div>}
              {booking.lunch && <div>Lunch: {booking.lunchDetails || "Yes"}</div>}
              {booking.equipment?.length ? <div>Equipment: {booking.equipment.join(", ")}</div> : null}
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={() => onEdit(booking)}
                style={{ padding: "0.5rem 0.75rem", background: "#facc15" }}
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(booking)}
                style={{ padding: "0.5rem 0.75rem", background: "#ef4444", color: "white" }}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
