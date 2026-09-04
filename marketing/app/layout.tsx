import "@mantine/core/styles.css";
import "ui/tokens.css";
import { ColorSchemeScript } from "@mantine/core";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Providers } from "./providers";

// Copied verbatim from frontend/index.html's own head -- see that file's
// comments for why this is minimal (product pitch not settled yet) and why
// og:url/og:image are omitted (need an absolute production URL).
export const metadata: Metadata = {
  title: "Bones",
  description: "Bones.",
  icons: {
    icon: [
      { url: "/brand/bones-mark.svg", type: "image/svg+xml" },
      { url: "/brand/bones-mark-32.png", sizes: "32x32" },
    ],
    apple: "/brand/bones-app-icon-512.png",
  },
  openGraph: { type: "website", title: "Bones" },
  twitter: { card: "summary", title: "Bones" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Same Google Fonts <link> approach as frontend/index.html, not
            next/font -- next/font's self-hosting generates its own scoped
            font-family name rather than the literal 'Instrument Sans'/
            'JetBrains Mono' tokens.css (shared with frontend/) already
            references by name, so plain links keep both apps loading fonts
            identically instead of reconciling two different mechanisms. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        {/* Mantine's own SSR-aware flash-prevention -- sets
            data-mantine-color-scheme before first paint, server-rendered
            here since Next actually renders per-request (frontend/'s own
            version of this is a hand-rolled inline script specifically
            because a static Vite SPA can't do this the proper way). */}
        <ColorSchemeScript defaultColorScheme="auto" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
