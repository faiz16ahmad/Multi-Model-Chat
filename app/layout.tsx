import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fiesta AI Pro",
  description: "Professional AI multi-model comparison platform with intelligent analysis",
  keywords: "AI, machine learning, model comparison, artificial intelligence, analysis",
  authors: [{ name: "Fiesta AI" }],
  viewport: "width=device-width, initial-scale=1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="antialiased pro-text-primary font-medium"
        style={{ 
          background: 'rgb(var(--background-start-rgb))',
          minHeight: '100vh'
        }}
        suppressHydrationWarning={true}
      >
        {children}
      </body>
    </html>
  );
}
