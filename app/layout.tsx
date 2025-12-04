import type { Metadata } from "next";
import { Slackey } from "next/font/google";
import "./globals.css";

const slackey = Slackey({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-slackey",
});

export const metadata: Metadata = {
  title: "WeaveMind - AI-Driven Learning Management System",
  description: "因材织学 - Intelligent personalized learning platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`antialiased ${slackey.variable}`}>
        {children}
      </body>
    </html>
  );
}

