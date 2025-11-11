"use client";

import dayjs from "dayjs";

const generateTimeSlots = () => {
  const slots = [];
  let current = dayjs().startOf("day").hour(7);
  const end = dayjs().startOf("day").hour(20);
  while (current.isBefore(end)) {
    slots.push(current);
    current = current.add(30, "minute");
  }
  return slots;
};

const slots = generateTimeSlots();

const findBookingForCell = (bookings, roomId, slotStart) => {
  return bookings.find((booking) => {
    const start = dayjs(booking.startTime);
    const end = dayjs(booking.endTime);
    return (
      booking.rooms.some((room) => room.id === roomId) &&
      slotStart.isSameOrAfter(start) &&
      slotStart.isBefore(end)
    );
  });
};

export default function CalendarGrid({ rooms, bookings, onSelectBooking }) {
  return (
    <section style={{ overflowX: "auto", background: "white", borderRadius: "8px", boxShadow: "0 1px 4px rgba(15, 23, 42, 0.12)" }}>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th style={{ position: "sticky", left: 0, background: "#f1f5f9", padding: "0.75rem", textAlign: "left" }}>Time</th>
            {rooms.map((room) => (
              <th key={room.id} style={{ padding: "0.75rem", textAlign: "left", borderLeft: "1px solid #e2e8f0" }}>
                {room.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {slots.map((slot) => (
            <tr key={slot.format()}>
              <td style={{ position: "sticky", left: 0, background: "#f8fafc", padding: "0.5rem", borderTop: "1px solid #e2e8f0" }}>
                {slot.format("HH:mm")}
              </td>
              {rooms.map((room) => {
                const booking = findBookingForCell(bookings, room.id, slot);
                const isStart = booking ? dayjs(booking.startTime).isSame(slot) : false;
                return (
                  <td
                    key={room.id}
                    style={{
                      minWidth: "160px",
                      padding: "0.35rem",
                      borderTop: "1px solid #e2e8f0",
                      borderLeft: "1px solid #e2e8f0",
                      background: booking ? "#dbeafe" : "transparent",
                      opacity: booking && !isStart ? 0.7 : 1,
                      cursor: booking ? "pointer" : "default"
                    }}
                    onClick={booking ? () => onSelectBooking(booking) : undefined}
                  >
                    {booking && isStart ? (
                      <div>
                        <strong>{booking.contactName}</strong>
                        <div>{dayjs(booking.startTime).format("HH:mm")} - {dayjs(booking.endTime).format("HH:mm")}</div>
                        <div>{booking.attendeeCount} attendees</div>
                      </div>
                    ) : null}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
