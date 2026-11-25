import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gridline — Utility field operations",
  description: "Offline-ready work orders and asset inspections for utility field teams.",
  manifest: "/manifest.webmanifest",
  applicationName: "Gridline",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Gridline" },
};

export const viewport: Viewport = {
  themeColor: "#173b30",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
