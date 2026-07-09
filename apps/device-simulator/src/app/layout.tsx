import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import { DeviceShell } from "@/components/DeviceShell";
import { ApiBaseUrlSync } from "@/components/ApiBaseUrlSync";
import { RealtimeProvider } from "@/components/RealtimeProvider";
import { NotificationToasts } from "@/components/NotificationToasts";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GymFlow Device Simulator",
  description: "Simulates a biometric attendance device for the GymFlow platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>
          <ApiBaseUrlSync />
          <RealtimeProvider />
          <NotificationToasts />
          <DeviceShell>{children}</DeviceShell>
        </Providers>
      </body>
    </html>
  );
}
