import "./globals.css";

export const metadata = {
  title: "Staffordshire Chambers Room Hire",
  description: "Manage room bookings across Staffordshire Chambers venues"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
