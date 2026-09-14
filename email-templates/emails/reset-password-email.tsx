import { emailTokens } from "../tokens.js";

// Same shape as verification-email.tsx -- see that file's own comment for
// why this is plain table-based HTML with inline styles rather than
// @react-email/components or a stylesheet. `url` here is Better Auth's own
// callback link (backend/src/auth.ts's sendResetPassword) -- it points at
// the backend's GET /reset-password/:token, which validates the token and
// redirects to web-app's /reset-password?token=... itself; this template
// never needs to know that shape, just render whatever url it's given.
export interface ResetPasswordEmailProps {
  url: string;
}

export default function ResetPasswordEmail({ url }: ResetPasswordEmailProps) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
        <title>Reset your password</title>
      </head>
      <body style={{ margin: 0, padding: 0, backgroundColor: emailTokens.surface }}>
        <div style={{ display: "none", overflow: "hidden", lineHeight: "1px", opacity: 0, maxHeight: 0, maxWidth: 0 }}>
          Reset your Bones account password.
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
                          We received a request to reset your password. Click below to choose a new one.
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
                                  Reset password
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
                          If you didn't request this, you can ignore this email -- your password won't change.
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

ResetPasswordEmail.PreviewProps = {
  url: "https://app.bones.example/reset-password?token=preview",
} satisfies ResetPasswordEmailProps;
