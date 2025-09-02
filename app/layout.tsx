import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Multi-Model AI Chat",
  description: "Compare responses from multiple AI models in real-time",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className="antialiased bg-slate-900 text-slate-200"
        suppressHydrationWarning={true}
      >
        {children}
      </body>
    </html>
  );
}
