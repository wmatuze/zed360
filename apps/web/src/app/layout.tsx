import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  applicationName: "Zed360",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "Zed360 — Find the right business in Zambia",
    template: "%s | Zed360",
  },
  description:
    "Tell Zed360 what you need and connect with relevant, active businesses across Zambia.",
  category: "business discovery",
  creator: "Zed360",
  openGraph: {
    title: "Zed360 — Find the right business in Zambia",
    description:
      "Post a need, compare current responses, or browse trusted business profiles across Zambia.",
    locale: "en_ZM",
    siteName: "Zed360",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Zed360 — Find the right business in Zambia",
    description:
      "Post a need, compare responses, or browse trusted business profiles across Zambia.",
  },
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#0b0d12",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-ZM"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
