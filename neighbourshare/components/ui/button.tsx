import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary";

const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 py-2 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-on-primary not-disabled:hover:bg-primary-hover",
  secondary:
    "border border-input-border bg-surface text-foreground not-disabled:hover:bg-border",
};

/**
 * Button classes, for links that should look like a button:
 * <Link href="/listings/new" className={buttonClasses()}>Add a listing</Link>
 */
export function buttonClasses(variant: Variant = "primary", className = "") {
  return `${base} ${variants[variant]} ${className}`.trim();
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

/** Defaults to type="button"; pass type="submit" inside forms. */
export function Button({
  variant = "primary",
  type = "button",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses(variant, className)}
      {...props}
    />
  );
}
