import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import TickerScroller from "@/components/TickerScroller";
import CryptoScroller from "@/components/CryptoScroller";
import AuthProvider from "@/components/AuthProvider";
import PageTransition from "@/components/PageTransition";
import IntroOverlay from "@/components/IntroOverlay";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mass Info - Stock Predictions & News",
  description:
    "Aggregated stock data, news, and AI-powered prediction lines",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-black">
        <IntroOverlay />
        <AuthProvider>
          <Navbar />
          <TickerScroller />
          <CryptoScroller />
          <main className="flex-1">
            <PageTransition>{children}</PageTransition>
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
