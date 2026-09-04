import { Button as MantineButton } from "@mantine/core";
import type { ButtonProps as MantineButtonProps } from "@mantine/core";
import type { ButtonHTMLAttributes, ElementType, ReactElement, ReactNode } from "react";

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
  // Mantine's Button is polymorphic (renders as <button>, <a>, a router
  // Link, ...) via this prop, but that typing lives only on Mantine's own
  // generic call signature, not the plain ButtonProps interface pulled in
  // above -- so it's re-declared here loosely rather than fought into full
  // generic type-safety. `to`/`href`/`state` cover this app's actual uses
  // (react-router's <Link> and plain anchors); Mantine passes whatever
  // else it's given straight through to `component` at runtime regardless
  // of what's typed here.
  component?: ElementType;
  to?: string;
  href?: string;
  state?: unknown;
  children?: ReactNode;
}

export function Button({ variant = "primary", size = "md", ...rest }: ButtonProps) {
  // Mantine's polymorphic call signature picks a specific overload based on
  // a literal `component` type, which a loosely-typed pass-through (see
  // ButtonProps above) can't satisfy -- cast rather than chase full
  // generic polymorphism typing here.
  const MantineButtonAny = MantineButton as (props: Record<string, unknown>) => ReactElement;
  return <MantineButtonAny variant={VARIANT_MAP[variant]} size={size} {...rest} />;
}
