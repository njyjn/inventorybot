// @ts-ignore - side-effect CSS import without type declarations
import "./globals.css";

import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#2563eb",
};

export const metadata: Metadata = {
  title: "inventorybot",
  description: "bot for inventory",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" style={{ colorScheme: 'light' }}>
      <body
        className="antialiased"
        style={{ backgroundColor: '#fafafa', color: '#000' }}
      >
        {children}
      </body>
    </html>
  );
}
