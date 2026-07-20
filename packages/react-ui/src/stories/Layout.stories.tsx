import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { AspectRatio, Container, Divider, Grid, Group, SimpleGrid, Stack } from "@mantine/core";
import { Page, Section } from "./Section";

const meta = { title: "Components/Layout" } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

function Box({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        padding: "0.5rem 0.75rem",
        borderRadius: "var(--mantine-radius-sm)",
        border: "1px solid var(--mantine-color-default-border)",
        background: "var(--app-color-surface-alt)",
        fontSize: "0.8rem",
        textAlign: "center",
      }}
    >
      {children}
    </div>
  );
}

function LayoutPage() {
  return (
    <Page title="Layout">
      <Section title="Group — horizontal, wraps by default">
        <Group>
          <Box>Gmail</Box>
          <Box>Slack</Box>
          <Box>Discord</Box>
        </Group>
      </Section>

      <Section title="Stack — vertical">
        <Stack maw={160} gap="xs">
          <Box>Gmail</Box>
          <Box>Slack</Box>
          <Box>Discord</Box>
        </Stack>
      </Section>

      <Section title="SimpleGrid — even columns">
        <SimpleGrid cols={3} maw={480}>
          <Box>1</Box>
          <Box>2</Box>
          <Box>3</Box>
          <Box>4</Box>
          <Box>5</Box>
          <Box>6</Box>
        </SimpleGrid>
      </Section>

      <Section title="Grid — 12-column, per-item span">
        <Grid maw={480}>
          <Grid.Col span={8}>
            <Box>span 8</Box>
          </Grid.Col>
          <Grid.Col span={4}>
            <Box>span 4</Box>
          </Grid.Col>
          <Grid.Col span={4}>
            <Box>span 4</Box>
          </Grid.Col>
          <Grid.Col span={4}>
            <Box>span 4</Box>
          </Grid.Col>
          <Grid.Col span={4}>
            <Box>span 4</Box>
          </Grid.Col>
        </Grid>
      </Section>

      <Section title="Divider">
        <Divider label="Connected sources" labelPosition="left" maw={360} />
      </Section>

      <Section title="Container — same primitive Landing.tsx uses">
        <Container size="xs" bg="var(--app-color-surface-alt)" py="md">
          <Box>size=&quot;xs&quot;, centered, capped width</Box>
        </Container>
      </Section>

      <Section title="AspectRatio">
        <AspectRatio ratio={16 / 9} maw={320}>
          <Box>16 / 9</Box>
        </AspectRatio>
      </Section>
    </Page>
  );
}

export const Layout: Story = {
  render: () => <LayoutPage />,
};
