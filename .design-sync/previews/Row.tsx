import { RowCard, Row } from "shared-ui";

// Row never appears outside RowCard in this repo -- composed inside its
// parent here, the only render of it that's actually true.
export function Default() {
  return (
    <RowCard>
      <Row label="Plan" description="Billed monthly, cancel anytime">
        Pro
      </Row>
    </RowCard>
  );
}

// Row with no description -- label + control only.
export function WithoutDescription() {
  return (
    <RowCard>
      <Row label="Notifications">On</Row>
    </RowCard>
  );
}
