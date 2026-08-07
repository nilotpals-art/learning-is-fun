import type { Metadata } from "next";
import "./globals.css";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: {
    default: "Learning Is Fun",
    template: "%s | Learning Is Fun",
  },
  description: "English Tutorial Management System",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full",
        "antialiased",
        "font-sans"
      )}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}