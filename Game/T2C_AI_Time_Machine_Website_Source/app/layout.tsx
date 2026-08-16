import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "T2C — The AI Time Machine",
  description:
    "Travel to real turning points in AI infrastructure, use only what was public, choose your thesis, then reveal what came next.",
  other: {
    "codex-preview": "development",
  },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB">
      <body className="antialiased">{children}</body>
    </html>
  );
}
