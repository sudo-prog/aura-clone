import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aura Clone",
  description: "Private Aura frontend and GitHub-backed component library",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
