import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { Toaster } from "react-hot-toast";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ParkShare — AI-Powered Smart Parking Marketplace",
  description:
    "Find, book, and manage parking spots instantly. AI-powered dynamic pricing, conflict resolution, and 360° damage detection.",
  keywords: ["parking", "smart parking", "AI", "marketplace", "booking"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="antialiased">
        <ErrorBoundary>{children}</ErrorBoundary>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#1a1a1a",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.1)",
            },
          }}
        />
      </body>
    </html>
  );
}
