import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Bankrupt to 1 Million",
    template: "%s | Bankrupt to 1 Million"
  },
  description:
    "A living documentary about rebuilding from financial rock bottom through community, collaboration and meaningful ventures.",
  openGraph: {
    title: "Bankrupt to 1 Million",
    description:
      "More than rebuilding a life. Building a movement — one story, one connection and one feature at a time.",
    type: "website"
  },
  robots: {
    index: true,
    follow: true
  }
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
