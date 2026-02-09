import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Field Nine OS",
  description: "Ultimate Professional Tool for Business Owners",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} bg-field-ivory text-field-black antialiased min-h-screen flex flex-col`}>
        {/* Header: 극도의 미니멀리즘 */}
        <header className="w-full py-6 px-8 flex justify-between items-center border-b border-black/5 sticky top-0 backdrop-blur-md z-50">
          <div className="font-bold text-xl tracking-tight">F9 OS</div>
          <nav className="hidden md:flex gap-6 text-sm font-medium text-field-gray">
            <a href="#" className="hover:text-field-black transition-colors">Projects</a>
            <a href="#" className="hover:text-field-black transition-colors">Settings</a>
          </nav>
        </header>

        {/* Main Content */}
        <main className="flex-1 w-full max-w-5xl mx-auto px-6 py-12">
          <Providers>
            {children}
          </Providers>
        </main>

        {/* Footer: 신뢰의 상징 */}
        <footer className="py-8 text-center text-xs text-field-gray border-t border-black/5">
          © 2026 Field Nine. All Systems Operational.
        </footer>
      </body>
    </html>
  );
}
