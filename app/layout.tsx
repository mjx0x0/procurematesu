import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: "ProcuremateSU | Digital Procurement Logbook for MSU-GenSan",
  description: "AI-powered procurement system for Mindanao State University - General Santos. Streamline purchase requests, track status, and ensure RA 12009 compliance.",
  keywords: "procurement, MSU-GenSan, RA 12009, digital logbook, AI assistant, purchase request",
  authors: [{ name: "ProcuremateSU Team" }],
  openGraph: {
    title: "ProcuremateSU | Digital Procurement Logbook for MSU-GenSan",
    description: "Streamline your procurement process with AI-powered assistance at MSU-GenSan.",
    type: "website",
    url: "https://procurematesu.vercel.app",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}