import type { Metadata } from "next";
import { Source_Sans_3 } from "next/font/google";

import "./globals.css";

const sourceSans3 = Source_Sans_3({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "WarmReach",
  description: "WarmReach: find hiring contacts and send personalized outreach"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={sourceSans3.className}>{children}</body>
    </html>
  );
}
