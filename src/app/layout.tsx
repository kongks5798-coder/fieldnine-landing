import "./globals.css";
import type { Metadata } from "next";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Field Nine OS",
  description: "AI-powered code editor with live preview and one-click deploy. Build, ship, and scale — all in one place.",
  openGraph: {
    title: "Field Nine OS",
    description: "AI-powered code editor with live preview and one-click deploy.",
    type: "website",
    locale: "ko_KR",
    siteName: "Field Nine OS",
  },
  twitter: {
    card: "summary_large_image",
    title: "Field Nine OS",
    description: "AI-powered code editor with live preview and one-click deploy.",
  },
  icons: {
    icon: "/favicon.ico",
  },
  other: {
    google: "notranslate",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning translate="no">
      <head>
        <meta charSet="UTF-8" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+KR:wght@400;500;600;700&display=swap"
        />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
