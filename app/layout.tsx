import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AuthProvider from "../components/AuthProvider";
import IdleTimer from "../components/IdleTimer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  icons: { icon: "/images/fav.ico", apple: "/images/fav.ico" },
  title: "Partner Team Onboarding",
  description: "Aplikasi Onboarding Partner PT. Alita Praya Mitra",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={inter.className}>
        <AuthProvider>
          <IdleTimer />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
