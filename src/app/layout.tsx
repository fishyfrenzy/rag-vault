import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/layout/BottomNav";

import { Navbar } from "@/components/layout/Navbar";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { FeedbackButton } from "@/components/feedback/FeedbackButton";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Ragvault",
  description: "Reference Archive & Marketplace for Vintage T-Shirts",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Ragvault",
  },
  icons: {
    icon: "/logo-wheel.png",
    apple: "/logo-wheel.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/logo-wheel.png" />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <Navbar />
          {children}
          <BottomNav />
          <FeedbackButton />
        </AuthProvider>
      </body>
    </html>
  );
}

