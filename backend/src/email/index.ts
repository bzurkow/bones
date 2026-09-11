import { SendEmailCommand, SESv2Client } from "@aws-sdk/client-sesv2";
import nodemailer from "nodemailer";

// EMAIL_SMTP_HOST is dev-only (see .env) -- unset in production. Same
// dev-endpoint-override shape as storage/index.ts's S3_ENDPOINT: presence of
// the env var picks the dev transport, absence falls back to the real AWS
// service. Dev points at Mailpit (docker-compose.dev.yml's new "mailpit"
// service, SMTP on :1025, a web UI to actually read what got sent on
// :8025) instead of real Amazon SES -- this repo's AWS_ACCESS_KEY_ID/
// AWS_SECRET_ACCESS_KEY are RustFS's fake local creds (see storage/
// index.ts), not real AWS ones, so hitting real SES in dev would just fail
// auth; Mailpit needs no credentials at all.
const smtpHost = process.env.EMAIL_SMTP_HOST;

// Nodemailer is the common interface across both transports -- its built-in
// SES transport (a SESv2Client + SendEmailCommand, per nodemailer's own SES
// docs) means production sending and dev SMTP sending go through the exact
// same `transport.sendMail` call below, not two divergent code paths per
// provider. Region/credentials for the SES client are the SDK's own
// default env var names (AWS_REGION/AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY),
// same convention as storage/index.ts's S3Client.
const transport = smtpHost
  ? nodemailer.createTransport({
      host: smtpHost,
      port: Number(process.env.EMAIL_SMTP_PORT ?? 1025),
      secure: false,
    })
  : nodemailer.createTransport({
      SES: { sesClient: new SESv2Client({ region: process.env.AWS_REGION }), SendEmailCommand },
    });

// EMAIL_FROM has no real value yet -- no sending domain/address is verified
// in SES for this project (see bones-roadmap-notes.md's emailing item). This
// placeholder lets the feature ship and be exercised end-to-end against
// Mailpit in dev; production sending will fail from SES ("Email address not
// verified") until a real EMAIL_FROM pointing at a verified SES identity is
// set, which is expected and fine -- there's no domain to send from yet.
const from = process.env.EMAIL_FROM ?? "Bones <onboarding@bones.example>";

// The one generic primitive every transactional email goes through --
// verification today, password reset/invitations later (see
// bones-roadmap-notes.md) reuse this rather than each growing its own
// provider wiring.
export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  await transport.sendMail({ from, to, subject, html });
}
