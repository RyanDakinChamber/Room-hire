# Staffordshire Chambers Room Hire

This version of the prototype ships as a single Node.js server (no external npm dependencies) that serves the Staffordshire Chambers-themed UI and exposes a JSON API so bookings are stored centrally for everyone. Data lives in `data/bookings.json`, so restarts keep existing reservations until you delete the file.

## Getting started

1. Start the server (no `npm install` is required because there are zero external packages):
   ```bash
   npm run dev
   ```
   The command serves the static front-end at `http://localhost:4000` and exposes the API under `/api`.

2. Open the site in your browser and pick a day. Bookings are shown for the selected date; click empty cells or **New Booking** to create reservations.

3. Any updates you make are saved to `data/bookings.json`, so colleagues can refresh and see them immediately. Use the booking list buttons to edit or delete entries.

## API overview

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/api/rooms` | Returns the seven Staffordshire Chambers rooms. |
| GET | `/api/bookings?date=YYYY-MM-DD` | Returns bookings for a specific day. |
| POST | `/api/bookings` | Creates a booking (body matches the form fields). |
| PUT | `/api/bookings/:id` | Updates an existing booking. |
| DELETE | `/api/bookings/:id` | Removes a booking. |

All payloads must use ISO datetimes that fall on the same day and align with 30-minute intervals. The server rejects overlapping bookings for any of the selected rooms.

## Deployment tips

- Copy the repository to your server and start the app with `npm run dev` (or `npm run start` for production). Use PM2 or a systemd service to keep it running.
- Back up `data/bookings.json` to retain bookings during redeployments.
- Behind a reverse proxy, forward HTTPS traffic to port 4000 so both the UI and API are available under the same hostname.

## Point 3 – point a subdomain at the app

Follow these steps on the server that is already running the room-hire app on port `4000`.

1. **Install and enable Nginx** (skip if already installed):
   ```bash
   sudo apt update
   sudo apt install -y nginx
   sudo systemctl enable --now nginx
   ```

2. **Create an Nginx server block for your subdomain** (replace `rooms.example.com` with your DNS name):
   ```bash
   sudo tee /etc/nginx/sites-available/room-hire.conf >/dev/null <<'EOF'
   server {
     listen 80;
     server_name rooms.example.com;

     location / {
       proxy_pass http://127.0.0.1:4000;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
     }
   }
   EOF
   ```

3. **Enable the site and reload Nginx:**
   ```bash
   sudo ln -s /etc/nginx/sites-available/room-hire.conf /etc/nginx/sites-enabled/room-hire.conf
   sudo nginx -t
   sudo systemctl reload nginx
   ```

4. **(Optional) Add HTTPS** using Let’s Encrypt once DNS is pointing at the server:
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d rooms.example.com
   ```

After these steps, visiting `http://rooms.example.com` will display the booking UI while the Node server continues listening privately on `127.0.0.1:4000`.
