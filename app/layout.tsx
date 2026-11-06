import type { Metadata } from "next";
import { SYSTEM_DESCRIPTION, SYSTEM_NAME } from "@/lib/system-branding";
import { ThemeProvider } from "@/components/ThemeProvider";
import PageTransition from "@/components/PageTransition";
import ConsoleSanitizer from "@/components/ConsoleSanitizer";
import AppThemeShell from "@/components/AppThemeShell";
import "./globals.css";
import "./portal-theme.css";
import "./portal-premium.css";
import "./page-transitions.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: {
    default: SYSTEM_NAME,
    template: `%s | ${SYSTEM_NAME}`,
  },
  description: SYSTEM_DESCRIPTION,
  keywords: ["procurement", "MSU-GenSan", "RA 12009", "purchase request", "Gab AI", "Mindanao State University", "General Santos", "government procurement", "e-procurement"],
  authors: [{ name: SYSTEM_NAME }],
  openGraph: {
    title: SYSTEM_NAME,
    description: SYSTEM_DESCRIPTION,
    type: "website",
    url: defaultUrl,
    siteName: SYSTEM_NAME,
    locale: "en_PH",
  },
  twitter: {
    card: "summary_large_image",
    title: SYSTEM_NAME,
    description: SYSTEM_DESCRIPTION,
  },
  icons: {
    icon: [{ url: "/procuremate-logo.svg", type: "image/svg+xml" }],
    shortcut: [{ url: "/procuremate-logo.svg", type: "image/svg+xml" }],
    apple: [{ url: "/procuremate-logo.svg", type: "image/svg+xml" }],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-video-preview': -1, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className="scroll-smooth">
      <body className="font-sans antialiased bg-white text-gray-900">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <ConsoleSanitizer />
          <PageTransition />
          <AppThemeShell>{children}</AppThemeShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
