import type { Metadata } from "next";
import { Inter } from 'next/font/google';
import { ThemeProvider } from "next-themes";
import "./globals.css";

// ============================================
// FONT CONFIGURATION
// ============================================
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  weight: ['300', '400', '500', '600', '700', '800', '900'],
});

// ============================================
// METADATA & SEO
// ============================================
const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  
  title: {
    default: "ProcuremateSU | Digital Procurement Logbook for MSU-GenSan",
    template: "%s | ProcuremateSU",
  },
  
  description: "AI-powered procurement system for Mindanao State University - General Santos. Streamline purchase requests, track status, and ensure RA 12009 compliance.",
  
  keywords: [
    "procurement",
    "MSU-GenSan",
    "RA 12009",
    "digital logbook",
    "AI assistant",
    "purchase request",
    "Mindanao State University",
    "General Santos",
    "government procurement",
    "e-procurement"
  ],
  
  authors: [{
    name: "ProcuremateSU Team",
    url: "https://procurematesu.vercel.app"
  }],
  
  openGraph: {
    title: "ProcuremateSU | Digital Procurement Logbook for MSU-GenSan",
    description: "Streamline your procurement process with AI-powered assistance at MSU-GenSan.",
    type: "website",
    url: "https://procurematesu.vercel.app",
    siteName: "ProcuremateSU",
    locale: "en_PH",
  },
  
  twitter: {
    card: "summary_large_image",
    title: "ProcuremateSU | Digital Procurement Logbook for MSU-GenSan",
    description: "AI-powered procurement system for MSU-GenSan. Streamline purchase requests and ensure RA 12009 compliance.",
  },
  
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon.png" },
    ],
  },
  
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

// ============================================
// LAYOUT COMPONENT
// ============================================
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} scroll-smooth`}
    >
      <body className="font-sans antialiased bg-white text-gray-900">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}