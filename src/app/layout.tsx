import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/layout/BottomNav";

import { Navbar } from "@/components/layout/Navbar";
import { AuthProvider } from "@/components/auth/AuthProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Ragvault",
  description: "Reference Archive & Marketplace for Vintage T-Shirts",
  icons: {
    icon: "/logo-wheel.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <AuthProvider>
          <Navbar />
          {children}
          <BottomNav />
        </AuthProvider>
      </body>
    </html>
  );
}
