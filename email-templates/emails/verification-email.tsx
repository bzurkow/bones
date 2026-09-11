import { emailTokens } from "../tokens.js";

// Plain HTML/JSX, not @react-email/components -- that package (and every
// individual @react-email/* component package it re-exports) was
// deprecated npm-wide in favor of importing from the unified "react-email"
// package, but that unified package pulls dev-only deps (PrismJS, marked,
// Tailwind) into anything that imports from it, ~80MB per bundle -- dead
// weight for a backend that only ever needs a rendered HTML string.
// @react-email/render's `render()` works on any React tree, not just their
// own components, so plain table-based HTML gets the same benefit (a real
// <!doctype>-wrapped, pretty-printed string, plus a plain-text
// alternative) with zero of that cost.
//
// Table layout, not flexbox/grid -- this is the one place in the repo
// CLAUDE.md's "Layout with flex/grid + gap" rule doesn't apply: email
// clients (Outlook desktop especially) only reliably support table-based
// layout. Every style is a literal inline `style` object, not a
// stylesheet -- most clients strip <style> blocks or class-based rules
// entirely.
export interface VerificationEmailProps {
  url: string;
}

export default function VerificationEmail({ url }: VerificationEmailProps) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Always light mode (explicit ask) -- some clients (Apple Mail,
            Outlook.com) auto-invert colors under a dark-mode preference
            unless told not to. A static light `bgcolor`/`color` alone
            isn't enough to stop that; these two meta tags are the actual
            opt-out. */}
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
        <title>Verify your email</title>
      </head>
      <body style={{ margin: 0, padding: 0, backgroundColor: emailTokens.surface }}>
        {/* Preview text -- the line most clients show in the inbox list
            next to the subject. Hidden in the body itself via a 1px clamp,
            not display:none (some clients ignore display:none here and
            show it anyway; a near-zero visible box is the reliable way). */}
        <div style={{ display: "none", overflow: "hidden", lineHeight: "1px", opacity: 0, maxHeight: 0, maxWidth: 0 }}>
          Confirm your email address to finish setting up your Bones account.
        </div>
        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ backgroundColor: emailTokens.surface }}>
          <tbody>
            <tr>
              <td align="center" style={{ padding: "40px 20px" }}>
                <table role="presentation" width="480" cellPadding={0} cellSpacing={0} style={{ maxWidth: 480, width: "100%" }}>
                  <tbody>
                    <tr>
                      <td
                        style={{
                          backgroundColor: emailTokens.bg,
                          border: `1px solid ${emailTokens.border}`,
                          borderRadius: 14,
                          padding: "40px",
                        }}
                      >
                        <div
                          style={{
                            fontFamily: emailTokens.fontSans,
                            fontSize: 17,
                            fontWeight: 600,
                            letterSpacing: "-0.02em",
                            color: emailTokens.ink,
                          }}
                        >
                          Bones
                        </div>
                        <div style={{ height: 32 }} />
                        <p
                          style={{
                            margin: 0,
                            fontFamily: emailTokens.fontSans,
                            fontSize: 16,
                            lineHeight: 1.6,
                            color: emailTokens.ink,
                          }}
                        >
                          Confirm your email address to finish setting up your account.
                        </p>
                        <div style={{ height: 24 }} />
                        <table role="presentation" cellPadding={0} cellSpacing={0}>
                          <tbody>
                            <tr>
                              <td
                                style={{
                                  backgroundColor: emailTokens.ink,
                                  borderRadius: emailTokens.radiusMd,
                                }}
                              >
                                <a
                                  href={url}
                                  style={{
                                    display: "inline-block",
                                    fontFamily: emailTokens.fontSans,
                                    fontSize: 15,
                                    fontWeight: 600,
                                    color: emailTokens.bg,
                                    textDecoration: "none",
                                    padding: "13px 26px",
                                  }}
                                >
                                  Verify email
                                </a>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                        <div style={{ height: 28 }} />
                        <p
                          style={{
                            margin: 0,
                            fontFamily: emailTokens.fontSans,
                            fontSize: 13,
                            lineHeight: 1.5,
                            color: emailTokens.muted,
                          }}
                        >
                          If you didn't create this account, you can ignore this email.
                        </p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
}

// react-email's `email dev` preview server (and its `PreviewProps`
// convention) renders this component with these props when no real ones
// are available -- lets the template be edited/previewed without a real
// backend request in flight.
VerificationEmail.PreviewProps = { url: "https://app.bones.example/verify?token=preview" } satisfies VerificationEmailProps;
