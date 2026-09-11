import "@mantine/core/styles.css";
import "shared-ui/tokens.css";
import { ColorSchemeScript } from "@mantine/core";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Providers } from "./providers";

// Copied verbatim from web-app/index.html's own head -- see that file's
// comments for why this is minimal (product pitch not settled yet) and why
// og:url/og:image are omitted (need an absolute production URL).
//
// oxlint flags this as a non-component export alongside RootLayout below
// (breaks Fast Refresh in theory), but `metadata` is Next's own App Router
// convention -- it MUST be exported from layout.tsx by this exact name, it
// can't move to another file the way an arbitrary shared constant could.
// A worst-case full reload on editing this rarely-touched file is a
// non-issue; suppressed rather than restructured around a framework
// requirement.
// oxlint-disable-next-line react/only-export-components
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
    // suppressHydrationWarning: ColorSchemeScript below sets
    // data-mantine-color-scheme on this element via a synchronous inline
    // script, before React hydrates -- an expected, benign mismatch
    // between the server-rendered markup and the DOM by the time
    // hydration runs (Mantine's own documented fix for this exact case).
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Same Google Fonts <link> approach as web-app/index.html, not
            next/font -- next/font's self-hosting generates its own scoped
            font-family name rather than the literal 'Instrument Sans'/
            'JetBrains Mono' tokens.css (shared with web-app/) already
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
            here since Next actually renders per-request (web-app/'s own
            version of this is a hand-rolled inline script specifically
            because a static Vite SPA can't do this the proper way). */}
        <ColorSchemeScript defaultColorScheme="light" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
