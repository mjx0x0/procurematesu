import type { Metadata } from "next";
import { Inter } from 'next/font/google';
import { ThemeProvider } from "next-themes";
import PageTransition from "@/components/PageTransition";
import RFQStagePopup from "@/components/RFQStagePopup";
import AppThemeShell from "@/components/AppThemeShell";
import "./globals.css";
import "./portal-theme.css";
import "./portal-premium.css";
import "./page-transitions.css";

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  weight: ['300', '400', '500', '600', '700', '800', '900'],
});

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: {
    default: "MSU GenSan Procurement System",
    template: "%s | MSU GenSan Procurement System",
  },
  description: "Digital procurement management system for Mindanao State University - General Santos, with purchase request tracking, transparency information, and Gab AI assistance.",
  keywords: ["procurement", "MSU-GenSan", "RA 12009", "purchase request", "Gab AI", "Mindanao State University", "General Santos", "government procurement", "e-procurement"],
  authors: [{ name: "MSU GenSan Procurement System" }],
  openGraph: {
    title: "MSU GenSan Procurement System",
    description: "Digital procurement management for Mindanao State University - General Santos.",
    type: "website",
    url: defaultUrl,
    siteName: "MSU GenSan Procurement System",
    locale: "en_PH",
  },
  twitter: {
    card: "summary_large_image",
    title: "MSU GenSan Procurement System",
    description: "Digital procurement management for MSU GenSan with Gab AI assistance.",
  },
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "any" }, { url: "/icon.png", type: "image/png" }],
    apple: [{ url: "/apple-icon.png" }],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-video-preview': -1, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} scroll-smooth`}>
      <body className="font-sans antialiased bg-white text-gray-900">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <PageTransition />
          <RFQStagePopup />
          <AppThemeShell>{children}</AppThemeShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
