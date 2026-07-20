import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Checkbox,
  Chip,
  ColorInput,
  FileInput,
  Group,
  MultiSelect,
  NumberInput,
  PasswordInput,
  PinInput,
  Radio,
  Rating,
  SegmentedControl,
  Select,
  Slider,
  Stack,
  Switch,
  TextInput,
  Textarea,
} from "@mantine/core";
import { Page, Section } from "./Section";

const meta = { title: "Components/Inputs" } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

function InputsPage() {
  return (
    <Page title="Inputs">
      <Section title="TextInput / Textarea">
        <Stack maw={360} gap="sm">
          <TextInput label="Email" placeholder="you@example.com" />
          <TextInput label="Disabled" placeholder="you@example.com" disabled />
          <TextInput label="Error state" defaultValue="not-an-email" error="Enter a valid email" />
          <Textarea label="Message" placeholder="Say something" autosize minRows={2} />
        </Stack>
      </Section>

      <Section title="NumberInput / PasswordInput / PinInput">
        <Stack maw={360} gap="sm">
          <NumberInput label="Quantity" defaultValue={1} min={0} max={10} />
          <PasswordInput label="Password" placeholder="••••••••" />
          <PinInput length={4} />
        </Stack>
      </Section>

      <Section title="Select / MultiSelect">
        <Stack maw={360} gap="sm">
          <Select
            label="Notification source"
            placeholder="Pick one"
            data={["Gmail", "Slack", "Discord", "Calendar"]}
            defaultValue="Gmail"
          />
          <MultiSelect
            label="Connected sources"
            placeholder="Pick any"
            data={["Gmail", "Slack", "Discord", "Calendar"]}
            defaultValue={["Gmail", "Slack"]}
          />
        </Stack>
      </Section>

      <Section title="Checkbox / Radio / Switch">
        <Stack gap="sm">
          <Checkbox.Group defaultValue={["gmail"]} label="Sources to poll">
            <Group gap="md" mt="xs">
              <Checkbox value="gmail" label="Gmail" />
              <Checkbox value="slack" label="Slack" />
              <Checkbox value="discord" label="Discord" />
            </Group>
          </Checkbox.Group>

          <Radio.Group defaultValue="light" label="Theme">
            <Group gap="md" mt="xs">
              <Radio value="light" label="Light" />
              <Radio value="dark" label="Dark" />
              <Radio value="auto" label="Auto" />
            </Group>
          </Radio.Group>

          <Switch defaultChecked label="Desktop notifications" />
          <Switch color="green" label="Sound" />
        </Stack>
      </Section>

      <Section title="Chip / SegmentedControl">
        <Stack gap="sm">
          <Chip.Group multiple defaultValue={["gmail", "slack"]}>
            <Group gap="xs">
              <Chip value="gmail">Gmail</Chip>
              <Chip value="slack">Slack</Chip>
              <Chip value="discord">Discord</Chip>
            </Group>
          </Chip.Group>

          <SegmentedControl data={["Unread", "All", "Snoozed"]} defaultValue="Unread" />
        </Stack>
      </Section>

      <Section title="Slider / Rating">
        <Stack maw={360} gap="lg">
          <Slider defaultValue={40} marks={[{ value: 0, label: "0" }, { value: 100, label: "100" }]} />
          <Rating defaultValue={3} />
        </Stack>
      </Section>

      <Section title="ColorInput / FileInput">
        <Stack maw={360} gap="sm">
          <ColorInput label="Accent color" defaultValue="#4263eb" />
          <FileInput label="Attach a file" placeholder="Choose a file" />
        </Stack>
      </Section>
    </Page>
  );
}

export const Inputs: Story = {
  render: () => <InputsPage />,
};
