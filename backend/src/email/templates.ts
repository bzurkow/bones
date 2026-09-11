// Plain, inline-styled HTML -- email clients don't load external
// stylesheets, and this isn't the app UI CLAUDE.md's rules govern, just a
// legible transactional message. One function per email kind; add the next
// one (password reset, invitations -- see bones-roadmap-notes.md) here
// rather than growing auth.ts with template markup.
export function verificationEmailHtml(url: string): string {
  return `
    <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; color: #0A0A0A; max-width: 480px;">
      <p>Confirm your email address to finish setting up your Bones account.</p>
      <p><a href="${url}" style="color: #0A0A0A; text-decoration: underline;">Verify email</a></p>
      <p style="color: #6E6E6E; font-size: 13px;">If you didn't create this account, you can ignore this email.</p>
    </div>
  `.trim();
}
