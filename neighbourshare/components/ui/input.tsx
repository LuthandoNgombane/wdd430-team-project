import { useId, type InputHTMLAttributes } from "react";
import { AlertCircleIcon } from "./icons";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  /** Shown below the field in the error color and read by screen readers. */
  error?: string;
  /** Optional help text below the label, e.g. "At least 8 characters". */
  hint?: string;
};

export function Input({
  label,
  error,
  hint,
  id,
  className = "",
  "aria-describedby": extraDescribedBy,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy =
    [extraDescribedBy, hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="font-medium">
        {label}
      </label>
      {hint && (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      )}
      {/* props first, so they can't drop the label, hint or error wiring */}
      <input
        {...props}
        id={inputId}
        aria-invalid={error ? true : props["aria-invalid"]}
        aria-describedby={describedBy}
        className={`min-h-11 rounded-md border bg-surface px-3 py-2 text-foreground placeholder:text-muted ${
          error ? "border-error" : "border-input-border"
        } ${className}`.trim()}
      />
      {error && (
        <p id={errorId} className="flex items-center gap-1 text-sm text-error">
          <AlertCircleIcon className="shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
