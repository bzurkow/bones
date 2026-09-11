// Actual template markup lives in the top-level email-templates/ package
// (own workspace, built with the app's design tokens, previewable via
// `yarn email-templates:dev`) -- re-exported from here so auth.ts imports
// from backend's own email/ module like sendEmail, rather than reaching
// into a sibling workspace package directly. Add the next render function
// (password reset, invitations) here the same way once email-templates
// has one.
export { renderVerificationEmail } from "email-templates";
