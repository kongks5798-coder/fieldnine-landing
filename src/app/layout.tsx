import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers"; // 여기서 가져오는 게 핵심!

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "KAUS TRINITY",
  description: "AI와 Web3의 만남",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}