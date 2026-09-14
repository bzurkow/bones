import { render } from "@react-email/render";
import ResetPasswordEmail from "./emails/reset-password-email.js";
import VerificationEmail from "./emails/verification-email.js";

// The package's real entry point (backend's own runtime dependency) --
// distinct from emails/, which react-email's `email dev` preview server
// reads directly and which this file also draws from. One render function
// per template; add the next one (invitations -- see
// bones-roadmap-notes.md) alongside this rather than growing a single
// generic "render(name, props)" -- keeps each template's actual prop shape
// real and type-checked at the call site instead of stringly-typed.
export async function renderVerificationEmail(url: string): Promise<string> {
  // pretty: true only affects whitespace/indentation of the output string
  // (via prettier's HTML printer) -- purely for legibility when reading raw
  // source in a mail client's "view original" or Mailpit's message
  // inspector; no effect on how it renders. render() also always emits a
  // handful of harmless `<!--$-->`-style React Suspense/hydration markers
  // as HTML comments (it wraps every render in a Suspense boundary to
  // support async components) -- every email client ignores HTML comments
  // outright, so these are inert bytes, not a bug to work around.
  return render(<VerificationEmail url={url} />, { pretty: true });
}

// Same shape as renderVerificationEmail above -- see that function's own
// comment for what `pretty: true` actually does.
export async function renderResetPasswordEmail(url: string): Promise<string> {
  return render(<ResetPasswordEmail url={url} />, { pretty: true });
}
