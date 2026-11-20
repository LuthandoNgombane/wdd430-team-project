import type { SelectHTMLAttributes } from "react";
import { controlClasses, Field, type FieldProps } from "./field";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> &
  FieldProps & {
    options: readonly string[];
    /** First, empty option, e.g. "Choose a category". */
    placeholder?: string;
  };

export function Select({
  label,
  error,
  hint,
  id,
  className,
  options,
  placeholder,
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
  ...props
}: SelectProps) {
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
        <select
          {...props}
          {...control}
          className={controlClasses(error, className)}
        >
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}
