import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Scraper by HighP | Enterprise WhatsApp Automation",
  description: "Formal and efficient WhatsApp group scraping and campaign management tool by HighP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-black`}>
        {children}
      </body>
    </html>
  );
}
