import { useId, type ReactNode } from "react";
import { AlertCircleIcon } from "./icons";

export type FieldProps = {
  label: string;
  /** Shown below the field in the error color and read by screen readers. */
  error?: string;
  /** Optional help text below the label, e.g. "At least 8 characters". */
  hint?: string;
};

type ControlProps = {
  id: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

/**
 * Label, hint and error around one form control, shared by Input, Select and
 * Textarea. `children` receives the id and aria props the control must use.
 */
export function Field({
  label,
  error,
  hint,
  id,
  invalid,
  describedBy: extraDescribedBy,
  children,
}: FieldProps & {
  id?: string;
  invalid?: boolean;
  describedBy?: string;
  children: (control: ControlProps) => ReactNode;
}) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy =
    [extraDescribedBy, hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={controlId} className="font-medium">
        {label}
      </label>
      {hint && (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      )}
      {children({
        id: controlId,
        "aria-invalid": error ? true : invalid,
        "aria-describedby": describedBy,
      })}
      {error && (
        <p id={errorId} className="flex items-center gap-1 text-sm text-error">
          <AlertCircleIcon className="shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

/** Classes shared by text inputs, selects and textareas. */
export function controlClasses(error: string | undefined, className = "") {
  return `min-h-11 rounded-md border bg-surface px-3 py-2 text-foreground placeholder:text-muted ${
    error ? "border-error" : "border-input-border"
  } ${className}`.trim();
}
