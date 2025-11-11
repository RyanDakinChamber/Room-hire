"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import DateNavigator from "./components/DateNavigator";
import RoomLegend from "./components/RoomLegend";
import CalendarGrid from "./components/CalendarGrid";
import BookingForm from "./components/BookingForm";
import BookingList from "./components/BookingList";

const ROOMS = [
  { id: 1, name: "Room 1", capacity: 20, defaultLayout: "boardroom" },
  { id: 2, name: "Room 2", capacity: 25, defaultLayout: "boardroom" },
  { id: 3, name: "Room 3", capacity: 30, defaultLayout: "theatre" },
  { id: 4, name: "Room 4", capacity: 30, defaultLayout: "theatre" },
  { id: 5, name: "The Pod", capacity: 8, defaultLayout: "u-shape" },
  { id: 6, name: "Boardroom", capacity: 12, defaultLayout: "boardroom" },
  { id: 7, name: "Members Lounge Room", capacity: 40, defaultLayout: "theatre" }
];

const HALF_HOUR_MINUTES = 30;

const createSampleBookings = () => {
  const today = dayjs();
  return [
    {
      id: 1,
      contactName: "Acme Corp",
      attendeeCount: 10,
      layout: "boardroom",
      refreshments: true,
      refreshmentsDetails: "Tea and coffee",
      lunch: false,
      lunchDetails: "",
      equipment: ["projector"],
      roomIds: [6],
      startTime: today.hour(9).minute(0).second(0).millisecond(0).toISOString(),
      endTime: today.hour(11).minute(0).second(0).millisecond(0).toISOString()
    },
    {
      id: 2,
      contactName: "Staff Training",
      attendeeCount: 18,
      layout: "theatre",
      refreshments: true,
      refreshmentsDetails: "Water and biscuits",
      lunch: true,
      lunchDetails: "Sandwich platter",
      equipment: ["flipchart"],
      roomIds: [3, 4],
      startTime: today.hour(13).minute(30).second(0).millisecond(0).toISOString(),
      endTime: today.hour(16).minute(0).second(0).millisecond(0).toISOString()
    }
  ];
};

const validateBooking = (payload, existingBookings, ignoreId) => {
  const errors = [];
  const start = dayjs(payload.startTime);
  const end = dayjs(payload.endTime);

  if (!payload.contactName || payload.contactName.trim().length < 2) {
    errors.push("Contact name must be at least 2 characters long.");
  }

  if (!Number.isInteger(payload.attendeeCount) || payload.attendeeCount < 1) {
    errors.push("Attendee count must be a positive whole number.");
  }

  if (!Array.isArray(payload.rooms) || payload.rooms.length === 0) {
    errors.push("Select at least one room for the booking.");
  }

  if (!start.isValid() || !end.isValid()) {
    errors.push("Start and end times must be valid.");
  } else {
    if (!start.isSame(end, "day")) {
      errors.push("Bookings must start and finish on the same day.");
    }

    if (!start.isBefore(end)) {
      errors.push("End time must be after the start time.");
    }

    const startMinutes = start.minute();
    const endMinutes = end.minute();
    if (startMinutes % HALF_HOUR_MINUTES !== 0 || endMinutes % HALF_HOUR_MINUTES !== 0) {
      errors.push("Bookings must align to 30-minute increments.");
    }

    const durationMinutes = end.diff(start, "minute");
    if (durationMinutes % HALF_HOUR_MINUTES !== 0) {
      errors.push("Booking length must be in 30-minute increments.");
    }

    const conflicts = existingBookings.filter((booking) => booking.id !== ignoreId);
    const overlaps = conflicts.find((booking) => {
      const bookingStart = dayjs(booking.startTime);
      const bookingEnd = dayjs(booking.endTime);
      const sharesRoom = booking.roomIds.some((roomId) => payload.rooms.includes(roomId));
      if (!sharesRoom) return false;
      return start.isBefore(bookingEnd) && end.isAfter(bookingStart);
    });

    if (overlaps) {
      errors.push("The selected rooms already have a booking in that time range.");
    }
  }

  if (payload.refreshments && !payload.refreshmentsDetails.trim()) {
    errors.push("Add some details for the refreshments request.");
  }

  if (payload.lunch && !payload.lunchDetails.trim()) {
    errors.push("Add some details for the lunch request.");
  }

  return { errors, start, end };
};

export default function HomePage() {
  const [selectedDate, setSelectedDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [formVisible, setFormVisible] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [bookings, setBookings] = useState(createSampleBookings);
  const nextIdRef = useRef(3);

  useEffect(() => {
    if (!formVisible) {
      setEditingBooking(null);
    }
  }, [formVisible]);

  const roomMap = useMemo(() => {
    const map = new Map();
    ROOMS.forEach((room) => map.set(room.id, room));
    return map;
  }, []);

  const bookingsForSelectedDate = useMemo(() => {
    return bookings
      .filter((booking) => dayjs(booking.startTime).format("YYYY-MM-DD") === selectedDate)
      .map((booking) => ({
        ...booking,
        rooms: booking.roomIds.map((id) => roomMap.get(id)).filter(Boolean)
      }));
  }, [bookings, roomMap, selectedDate]);

  const handleCreateBooking = async (formValues) => {
    const payload = {
      ...formValues,
      attendeeCount: Number(formValues.attendeeCount),
      rooms: formValues.rooms,
      refreshmentsDetails: formValues.refreshmentsDetails ?? "",
      lunchDetails: formValues.lunchDetails ?? ""
    };

    const { errors, start, end } = validateBooking(payload, bookings);
    if (errors.length > 0) {
      const error = new Error("Validation failed");
      error.details = errors;
      throw error;
    }

    const newBooking = {
      id: nextIdRef.current++,
      contactName: payload.contactName.trim(),
      attendeeCount: payload.attendeeCount,
      layout: payload.layout,
      refreshments: Boolean(payload.refreshments),
      refreshmentsDetails: payload.refreshments ? payload.refreshmentsDetails.trim() : "",
      lunch: Boolean(payload.lunch),
      lunchDetails: payload.lunch ? payload.lunchDetails.trim() : "",
      equipment: payload.equipment ?? [],
      roomIds: payload.rooms,
      startTime: start.toISOString(),
      endTime: end.toISOString()
    };

    setBookings((prev) => [...prev, newBooking]);
    setFormVisible(false);
  };

  const handleUpdateBooking = async (formValues) => {
    const payload = {
      ...formValues,
      attendeeCount: Number(formValues.attendeeCount),
      rooms: formValues.rooms,
      refreshmentsDetails: formValues.refreshmentsDetails ?? "",
      lunchDetails: formValues.lunchDetails ?? ""
    };

    const { errors, start, end } = validateBooking(payload, bookings, payload.id);
    if (errors.length > 0) {
      const error = new Error("Validation failed");
      error.details = errors;
      throw error;
    }

    setBookings((prev) =>
      prev.map((booking) =>
        booking.id === payload.id
          ? {
              ...booking,
              contactName: payload.contactName.trim(),
              attendeeCount: payload.attendeeCount,
              layout: payload.layout,
              refreshments: Boolean(payload.refreshments),
              refreshmentsDetails: payload.refreshments
                ? payload.refreshmentsDetails.trim()
                : "",
              lunch: Boolean(payload.lunch),
              lunchDetails: payload.lunch ? payload.lunchDetails.trim() : "",
              equipment: payload.equipment ?? [],
              roomIds: payload.rooms,
              startTime: start.toISOString(),
              endTime: end.toISOString()
            }
          : booking
      )
    );

    setFormVisible(false);
  };

  const handleDeleteBooking = (booking) => {
    if (window.confirm("Are you sure you want to delete this booking?")) {
      setBookings((prev) => prev.filter((item) => item.id !== booking.id));
    }
  };

  const handleSelectBooking = (booking) => {
    const current = bookings.find((item) => item.id === booking.id);
    if (!current) {
      return;
    }

    setEditingBooking({
      ...current,
      rooms: current.roomIds,
      startTime: dayjs(current.startTime).format("YYYY-MM-DDTHH:mm"),
      endTime: dayjs(current.endTime).format("YYYY-MM-DDTHH:mm")
    });
    setFormVisible(true);
  };

  const startNewBooking = () => {
    setEditingBooking(null);
    setFormVisible((prev) => !prev);
  };

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1>Room Hire Calendar</h1>
          <p>Prototype calendar with in-browser bookings for quick demonstrations.</p>
        </div>
        <button
          onClick={startNewBooking}
          style={{ padding: "0.75rem 1.2rem", background: "#2f80ed", color: "white" }}
        >
          {formVisible ? "Close Form" : "New Booking"}
        </button>
      </header>

      <DateNavigator selectedDate={selectedDate} onChange={setSelectedDate} />

      <RoomLegend rooms={ROOMS} />

      <CalendarGrid
        rooms={ROOMS}
        bookings={bookingsForSelectedDate}
        onSelectBooking={handleSelectBooking}
      />

      {formVisible && (
        <section
          style={{
            background: "white",
            padding: "1.5rem",
            borderRadius: "8px",
            boxShadow: "0 1px 4px rgba(15, 23, 42, 0.12)"
          }}
        >
          <h2>{editingBooking ? "Edit Booking" : "Create Booking"}</h2>
          <BookingForm
            rooms={ROOMS}
            initialData={editingBooking ?? { startTime: `${selectedDate}T09:00`, endTime: `${selectedDate}T10:00` }}
            onSubmit={editingBooking ? handleUpdateBooking : handleCreateBooking}
            onCancel={() => setFormVisible(false)}
          />
        </section>
      )}

      <BookingList
        bookings={bookingsForSelectedDate}
        onEdit={handleSelectBooking}
        onDelete={handleDeleteBooking}
      />
    </div>
  );
}
