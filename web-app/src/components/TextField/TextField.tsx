import { useId } from "react";
import type { InputHTMLAttributes } from "react";
import styles from "./TextField.module.css";

// Plain styled <input>, not a Mantine TextInput/PasswordInput -- nothing in
// shared-ui's theme.ts themes those yet, and a hand-rolled CSS-module input
// reading tokens.css directly is more consistent with this repo's
// border/token-driven style (CLAUDE.md rules 1/3/9) than fighting Mantine's
// default chrome. Built here (web-app/src/components), not shared-ui, per
// this folder's own index.ts comment naming TextField as the next component
// to add "as the pages that need them get built."
export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  label: string;
  // Shown in mono under the field when there's no error -- e.g. the
  // password-rules hint on the sign-up form.
  helperText?: string;
  error?: string | null;
}

export function TextField({ label, helperText, error, className, ...inputProps }: TextFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className={`${styles.input} ${error ? styles.hasError : ""} ${className ?? ""}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || helperText ? hintId : undefined}
        {...inputProps}
      />
      {error ? (
        <p className={styles.errorText} id={hintId}>
          {error}
        </p>
      ) : helperText ? (
        <p className={styles.helperText} id={hintId}>
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
