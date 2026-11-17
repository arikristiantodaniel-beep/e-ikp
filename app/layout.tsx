import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "E-IKP | RSUD Merah Putih",
  description: "Portal pelaporan Insiden Keselamatan Pasien RSUD Merah Putih.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
