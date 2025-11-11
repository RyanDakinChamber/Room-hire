"use client";

import { useState, useEffect } from "react";
import dayjs from "dayjs";
import useSWR from "swr";
import { apiClient } from "./api/client";
import DateNavigator from "./components/DateNavigator";
import RoomLegend from "./components/RoomLegend";
import CalendarGrid from "./components/CalendarGrid";
import BookingForm from "./components/BookingForm";
import BookingList from "./components/BookingList";

export default function HomePage() {
  const [selectedDate, setSelectedDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [formVisible, setFormVisible] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);

  const {
    data: roomsData,
    error: roomsError
  } = useSWR("/rooms", (path) => apiClient.get(path));

  const {
    data: bookingsData,
    error: bookingsError,
    mutate: mutateBookings
  } = useSWR(
    selectedDate ? ["/bookings", selectedDate] : null,
    ([path, date]) => apiClient.get(path, { date })
  );

  const rooms = roomsData?.rooms ?? [];
  const bookings = bookingsData?.bookings ?? [];

  useEffect(() => {
    if (!formVisible) {
      setEditingBooking(null);
    }
  }, [formVisible]);

  const handleCreateBooking = async (data) => {
    await apiClient.post("/bookings", {
      ...data,
      startTime: dayjs(data.startTime).toISOString(),
      endTime: dayjs(data.endTime).toISOString()
    });
    await mutateBookings();
    setFormVisible(false);
  };

  const handleUpdateBooking = async (data) => {
    await apiClient.put(`/bookings/${data.id}`,
      {
        ...data,
        startTime: dayjs(data.startTime).toISOString(),
        endTime: dayjs(data.endTime).toISOString()
      }
    );
    await mutateBookings();
    setFormVisible(false);
  };

  const handleDeleteBooking = async (booking) => {
    if (window.confirm("Are you sure you want to delete this booking?")) {
      await apiClient.delete(`/bookings/${booking.id}`);
      await mutateBookings();
    }
  };

  const handleSelectBooking = (booking) => {
    setEditingBooking({
      ...booking,
      startTime: dayjs(booking.startTime).format("YYYY-MM-DDTHH:mm"),
      endTime: dayjs(booking.endTime).format("YYYY-MM-DDTHH:mm")
    });
    setFormVisible(true);
  };

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1>Room Hire Calendar</h1>
          <p>Book and manage Staffordshire Chambers rooms in 30-minute increments.</p>
        </div>
        <button
          onClick={() => {
            setEditingBooking(null);
            setFormVisible((prev) => !prev);
          }}
          style={{ padding: "0.75rem 1.2rem", background: "#2f80ed", color: "white" }}
        >
          {formVisible ? "Close Form" : "New Booking"}
        </button>
      </header>

      <DateNavigator selectedDate={selectedDate} onChange={setSelectedDate} />

      {roomsError && <div>Error loading rooms</div>}
      {bookingsError && <div>Error loading bookings</div>}

      <RoomLegend rooms={rooms} />

      <CalendarGrid rooms={rooms} bookings={bookings} onSelectBooking={handleSelectBooking} />

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
            rooms={rooms}
            initialData={editingBooking}
            onSubmit={editingBooking ? handleUpdateBooking : handleCreateBooking}
            onCancel={() => setFormVisible(false)}
          />
        </section>
      )}

      <BookingList bookings={bookings} onEdit={handleSelectBooking} onDelete={handleDeleteBooking} />
    </div>
  );
}
