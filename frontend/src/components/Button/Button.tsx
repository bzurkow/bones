import { Button as MantineButton } from "@mantine/core";
import type { ButtonProps as MantineButtonProps } from "@mantine/core";
import type { ButtonHTMLAttributes } from "react";

// Thin translation from COMPONENTS.md's variant names to the Mantine
// variant they're themed onto (see theme.ts's Button.extend) -- all actual
// rendering/behavior (polymorphism, focus, disabled, loading) is Mantine's.
export type ButtonVariant = "primary" | "secondary" | "quiet" | "text";
export type ButtonSize = "sm" | "md";

const VARIANT_MAP: Record<ButtonVariant, MantineButtonProps["variant"]> = {
  primary: "filled",
  secondary: "outline",
  quiet: "default",
  text: "subtle",
};

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "color" | "style" | "size">,
    Omit<MantineButtonProps, "variant" | "size"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({ variant = "primary", size = "md", ...rest }: ButtonProps) {
  return <MantineButton variant={VARIANT_MAP[variant]} size={size} {...rest} />;
}
