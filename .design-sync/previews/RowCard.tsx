import { RowCard, Row } from "shared-ui";

// The settings-row pattern this was extracted from: a bordered card whose
// rows share a hairline divider, each with a label + description on the
// left and a control or value on the right.
export function Default() {
  return (
    <RowCard>
      <Row label="Email" description="Used for sign-in and notifications">
        ben@example.com
      </Row>
      <Row label="Two-factor auth" description="Require a code at sign-in">
        Enabled
      </Row>
      <Row label="Delete account" description="Permanently remove your account and data">
        Delete
      </Row>
    </RowCard>
  );
}

// A Row with no description -- label + control only.
export function WithoutDescription() {
  return (
    <RowCard>
      <Row label="Workspace name">Bones</Row>
      <Row label="Time zone">UTC</Row>
    </RowCard>
  );
}
