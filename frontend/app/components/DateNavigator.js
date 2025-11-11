"use client";

import dayjs from "dayjs";

export default function DateNavigator({ selectedDate, onChange }) {
  const current = dayjs(selectedDate);

  const handlePrev = () => onChange(current.subtract(1, "day").format("YYYY-MM-DD"));
  const handleNext = () => onChange(current.add(1, "day").format("YYYY-MM-DD"));
  const handleToday = () => onChange(dayjs().format("YYYY-MM-DD"));

  return (
    <section style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
      <button onClick={handlePrev} style={{ padding: "0.5rem 1rem", background: "#e1e7f0" }}>
        Previous
      </button>
      <strong>{current.format("dddd, D MMMM YYYY")}</strong>
      <button onClick={handleNext} style={{ padding: "0.5rem 1rem", background: "#e1e7f0" }}>
        Next
      </button>
      <button
        onClick={handleToday}
        style={{ marginLeft: "auto", padding: "0.5rem 1rem", background: "#2f80ed", color: "white" }}
      >
        Today
      </button>
    </section>
  );
}
