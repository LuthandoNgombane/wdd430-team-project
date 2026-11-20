import type { InputHTMLAttributes } from "react";
import { controlClasses, Field, type FieldProps } from "./field";

type InputProps = InputHTMLAttributes<HTMLInputElement> & FieldProps;

export function Input({
  label,
  error,
  hint,
  id,
  className,
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
  ...props
}: InputProps) {
  return (
    <Field
      label={label}
      error={error}
      hint={hint}
      id={id}
      invalid={invalid === true || invalid === "true"}
      describedBy={describedBy}
    >
      {(control) => (
        // props first, so they can't drop the label, hint or error wiring
        <input
          {...props}
          {...control}
          className={controlClasses(error, className)}
        />
      )}
    </Field>
  );
}
