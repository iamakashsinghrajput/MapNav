// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
// Leaflet CSS is imported directly in the Map component

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MapNav - Your Navigation App",
  description: "Find your way anywhere with MapNav - responsive navigation app with route planning",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}