import type { ReactNode } from "react";
import { Stack, Title } from "@mantine/core";

export function Page({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Stack gap="xl" maw={900}>
      <Title order={1}>{title}</Title>
      {children}
    </Stack>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Stack gap="xs">
      <Title order={3}>{title}</Title>
      {children}
    </Stack>
  );
}
