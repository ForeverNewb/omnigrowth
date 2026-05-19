import { ConvexClientProvider } from "@/components/providers/ConvexClientProvider";
import { ThemeScript } from "@/components/ui/ThemeScript";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import type { Metadata } from "next";
import { JetBrains_Mono, Playfair_Display, Source_Sans_3 } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-serif",
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-sans",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "OmniGrowth — Marketing on autopilot for teams who post everywhere",
  description:
    "Multi-LLM AI post generator, unified calendar across every channel, and analytics that tell you what to make next. Paid in OmniBits.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html
        lang="en"
        className={`${playfair.variable} ${sourceSans.variable} ${jetbrains.variable}`}
        suppressHydrationWarning
      >
        <head>
          <ThemeScript />
        </head>
        <body suppressHydrationWarning>
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
