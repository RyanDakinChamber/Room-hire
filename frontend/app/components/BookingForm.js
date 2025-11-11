"use client";

import { useState, useEffect } from "react";

const emptyState = {
  id: undefined,
  contactName: "",
  attendeeCount: 1,
  layout: "boardroom",
  refreshments: false,
  refreshmentsDetails: "",
  lunch: false,
  lunchDetails: "",
  equipment: [],
  rooms: [],
  startTime: "",
  endTime: ""
};

const equipmentOptions = [
  { value: "laptop", label: "Laptop" },
  { value: "projector", label: "Projector" },
  { value: "flipchart", label: "Flipchart" }
];

export default function BookingForm({ rooms, initialData, onSubmit, onCancel }) {
  const [formState, setFormState] = useState(emptyState);
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    setFormState(initialData ? { ...emptyState, ...initialData } : emptyState);
    setErrors([]);
  }, [initialData]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormState((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));

    if (name === "refreshments" && !checked) {
      setFormState((prev) => ({ ...prev, refreshmentsDetails: "" }));
    }

    if (name === "lunch" && !checked) {
      setFormState((prev) => ({ ...prev, lunchDetails: "" }));
    }
  };

  const handleEquipmentChange = (value) => {
    setFormState((prev) => {
      const exists = prev.equipment.includes(value);
      return {
        ...prev,
        equipment: exists
          ? prev.equipment.filter((item) => item !== value)
          : [...prev.equipment, value]
      };
    });
  };

  const handleRoomToggle = (roomId) => {
    setFormState((prev) => {
      const exists = prev.rooms.includes(roomId);
      return {
        ...prev,
        rooms: exists
          ? prev.rooms.filter((id) => id !== roomId)
          : [...prev.rooms, roomId]
      };
    });
  };

  const submit = async (event) => {
    event.preventDefault();
    try {
      await onSubmit(formState);
      setErrors([]);
    } catch (error) {
      setErrors(error.details ?? [error.message]);
    }
  };

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: "1rem" }}>
      {errors.length > 0 && (
        <div style={{ background: "#fee2e2", padding: "0.75rem", borderRadius: "6px" }}>
          <strong>There were issues:</strong>
          <ul>
            {errors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <label>
        Contact Name
        <input
          name="contactName"
          type="text"
          value={formState.contactName}
          onChange={handleChange}
          required
        />
      </label>

      <label>
        Number of Attendees
        <input
          name="attendeeCount"
          type="number"
          min={1}
          value={formState.attendeeCount}
          onChange={handleChange}
          required
        />
      </label>

      <label>
        Layout
        <select name="layout" value={formState.layout} onChange={handleChange}>
          <option value="boardroom">Boardroom</option>
          <option value="u-shape">U-Shape</option>
          <option value="theatre">Theatre</option>
        </select>
      </label>

      <fieldset>
        <legend>Rooms</legend>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {rooms.map((room) => (
            <label
              key={room.id}
              style={{
                border: "1px solid #cbd5f5",
                padding: "0.5rem 0.75rem",
                borderRadius: "4px",
                background: formState.rooms.includes(room.id) ? "#2f80ed" : "white",
                color: formState.rooms.includes(room.id) ? "white" : "inherit"
              }}
            >
              <input
                type="checkbox"
                checked={formState.rooms.includes(room.id)}
                onChange={() => handleRoomToggle(room.id)}
                style={{ display: "none" }}
              />
              {room.name}
            </label>
          ))}
        </div>
      </fieldset>

      <label>
        Start Time
        <input
          type="datetime-local"
          name="startTime"
          value={formState.startTime}
          onChange={handleChange}
          required
        />
      </label>

      <label>
        End Time
        <input
          type="datetime-local"
          name="endTime"
          value={formState.endTime}
          onChange={handleChange}
          required
        />
      </label>

      <label>
        <input
          type="checkbox"
          name="refreshments"
          checked={formState.refreshments}
          onChange={handleChange}
        />
        Refreshments required?
      </label>

      {formState.refreshments && (
        <label>
          Refreshments details
          <textarea
            name="refreshmentsDetails"
            value={formState.refreshmentsDetails}
            onChange={handleChange}
          />
        </label>
      )}

      <label>
        <input type="checkbox" name="lunch" checked={formState.lunch} onChange={handleChange} />
        Lunch required?
      </label>

      {formState.lunch && (
        <label>
          Lunch details
          <textarea
            name="lunchDetails"
            value={formState.lunchDetails}
            onChange={handleChange}
          />
        </label>
      )}

      <fieldset>
        <legend>Equipment</legend>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          {equipmentOptions.map((option) => (
            <label key={option.value}>
              <input
                type="checkbox"
                checked={formState.equipment.includes(option.value)}
                onChange={() => handleEquipmentChange(option.value)}
              />{" "}
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
        <button type="button" onClick={onCancel} style={{ padding: "0.6rem 1rem", background: "#e2e8f0" }}>
          Cancel
        </button>
        <button type="submit" style={{ padding: "0.6rem 1rem", background: "#2f80ed", color: "white" }}>
          {formState.id ? "Update Booking" : "Create Booking"}
        </button>
      </div>
    </form>
  );
}
