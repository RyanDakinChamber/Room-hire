# Staffordshire Chambers Room Hire (Prototype)

A lightweight Next.js prototype that showcases the Staffordshire Chambers room-hire experience without any backend or database dependencies. All bookings live in memory so you can demonstrate the scheduling flow instantly—data resets whenever the dev server reloads.

## Getting Started

1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```
2. Launch the development server:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:3000` in your browser to explore the interactive booking calendar.

## Features in this Prototype

- Preloaded sample bookings for today so the calendar feels alive immediately.
- Create, edit, and delete bookings across all Staffordshire Chambers rooms.
- Enforces 30-minute slot increments, room conflict detection, and same-day bookings.
- Capture layout preferences, refreshments, lunch requirements, and equipment needs.
- Fully client-side logic, making it easy to share or demo without extra services.

When you're ready to introduce persistence, this UI can be connected to an API layer or database-backed service.
