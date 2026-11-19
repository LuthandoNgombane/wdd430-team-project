import type { TextareaHTMLAttributes } from "react";
import { controlClasses, Field, type FieldProps } from "./field";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & FieldProps;

export function Textarea({
  label,
  error,
  hint,
  id,
  className,
  rows = 5,
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
  ...props
}: TextareaProps) {
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
        <textarea
          {...props}
          {...control}
          rows={rows}
          className={controlClasses(error, className)}
        />
      )}
    </Field>
  );
}
