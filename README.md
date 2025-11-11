# Staffordshire Chambers Room Hire (Static Demo)

This repository now ships as a single self-contained HTML file that recreates the room-hire booking experience entirely in the browser. There are no build steps, databases, or dependencies—upload `index.html` to any static web host (or double-click it on your desktop) and you can demonstrate the full booking workflow immediately.

## Features

- Seven Staffordshire Chambers rooms with capacity and default layout details.
- Day-by-day calendar view showing bookings across all rooms in 30-minute slots.
- Create, edit, and delete bookings with layout, refreshments, lunch, and equipment options.
- Real-time conflict detection preventing overlapping bookings in the same room.
- All data is held in memory for demo purposes and resets on page refresh.

## Using the Demo

1. Open `index.html` in a modern browser (Chrome, Edge, Firefox, Safari).
2. Use the navigation controls to change day or jump to a specific date.
3. Click **New Booking** or tap an empty slot/time cell to open the booking popup (existing bookings open the editor for updates).
4. Fill in the required information and save—new entries appear instantly in the calendar and list.

To share or host the prototype, simply copy `index.html` to your web server or hosting provider. No additional configuration is required.
