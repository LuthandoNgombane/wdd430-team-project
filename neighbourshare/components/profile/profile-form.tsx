"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Button } from "@/components/ui/button";
import { AlertCircleIcon, CheckCircleIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  BIO_MAX,
  EMAIL_MAX,
  NAME_MAX,
  PHONE_MAX,
  validateProfile,
  type ProfileErrors,
  type ProfileField,
  type ProfileInput,
} from "@/lib/profiles/validate";

type Values = Record<ProfileField, string>;
type FormField = ProfileField | "currentPassword";
type FormErrors = ProfileErrors & { currentPassword?: string };

/** Fields in the order they appear, so focus goes to the first problem on screen. */
const FORM_ORDER: readonly FormField[] = [
  "name",
  "neighborhood",
  "bio",
  "email",
  "currentPassword",
  "phone",
];

const sameEmail = (a: string, b: string) =>
  a.trim().toLowerCase() === b.trim().toLowerCase();

type ProfileFormProps = {
  initial: ProfileInput;
  neighborhoods: readonly string[];
  /** Link to this member's public profile. */
  publicHref: string;
  /** Where to send the member if their session has ended. */
  signInHref: string;
};

const fieldId = (field: FormField) => `profile-${field}`;

function toValues(profile: ProfileInput): Values {
  return { ...profile, phone: profile.phone ?? "" };
}

export function ProfileForm({
  initial,
  neighborhoods,
  publicHref,
  signInHref,
}: ProfileFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState<Values>(() => toValues(initial));
  // The profile as last saved. "Discard changes" and leaving the page go
  // back to it, and changing its email needs the current password.
  const [savedValues, setSavedValues] = useState<Values>(() => toValues(initial));
  const [currentPassword, setCurrentPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const emailChanged = !sameEmail(values.email, savedValues.email);
  const hasChanges = FORM_ORDER.some(
    (f) => f !== "currentPassword" && values[f] !== savedValues[f],
  );
  const savedBannerRef = useRef<HTMLDivElement>(null);
  // Read by the cleanup below, which runs after the latest render's values.
  const savedValuesRef = useRef(savedValues);
  useEffect(() => {
    savedValuesRef.current = savedValues;
  }, [savedValues]);

  /** Back to the saved profile: fields, errors and messages. */
  function resetToSaved(to: Values) {
    setValues(to);
    setCurrentPassword("");
    setErrors({});
    setFormError("");
  }

  // After a save, move focus to the banner at the top: the page scrolls to it
  // (even when Save was clicked at the bottom on a phone) and screen readers
  // read it out.
  useEffect(() => {
    if (saved) savedBannerRef.current?.focus();
  }, [saved]);

  // With Cache Components, Next.js keeps this page mounted but hidden after
  // you navigate away (React <Activity>), and shows it again as it was.
  // Coming back should show the saved profile, so unsaved edits, errors,
  // the typed password and the "saved" banner are all cleared when the page
  // is hidden.
  useLayoutEffect(
    () => () => {
      resetToSaved(savedValuesRef.current);
      setSaved(false);
    },
    [],
  );

  function discardChanges() {
    resetToSaved(savedValues);
    // The button disappears, so put focus back at the start of the form.
    requestAnimationFrame(() =>
      formRef.current?.querySelector<HTMLElement>(`#${fieldId("name")}`)?.focus(),
    );
  }

  const set = (field: ProfileField) => (value: string) => {
    setValues((v) => ({ ...v, [field]: value }));
    // The "saved" banner stays while editing: removing it from the top of
    // the form would shift every field up under the cursor. It's cleared on
    // the next save instead.
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  };

  function showErrors(next: FormErrors) {
    setErrors(next);
    const first = FORM_ORDER.find((f) => next[f]);
    if (first) {
      // Wait for the error text to render, then move focus to the first problem.
      requestAnimationFrame(() =>
        formRef.current
          ?.querySelector<HTMLElement>(`#${fieldId(first)}`)
          ?.focus(),
      );
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setSaved(false);

    // Quick check in the browser; the server checks everything again.
    const check = validateProfile(values, neighborhoods);
    const found: FormErrors = check.ok ? {} : { ...check.errors };
    if (emailChanged && !currentPassword) {
      found.currentPassword = "Enter your current password to change your email.";
    }
    if (Object.keys(found).length > 0) return showErrors(found);

    setSaving(true);
    try {
      const response = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        // The password is only sent when it's needed.
        body: JSON.stringify(emailChanged ? { ...values, currentPassword } : values),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        setValues(toValues(data.profile));
        setSavedValues(toValues(data.profile));
        setCurrentPassword("");
        setErrors({});
        setSaved(true);
        router.refresh(); // so the header shows the new name
      } else if (response.status === 401) {
        window.location.assign(signInHref);
        return;
      } else if (data.fields) {
        showErrors(data.fields);
      } else {
        setFormError(data.error ?? "Something went wrong. Try again.");
      }
    } catch {
      setFormError(
        "Your profile could not be saved. Check your connection and try again.",
      );
    }
    setSaving(false);
  }

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-6"
    >
      {saved && (
        <div
          ref={savedBannerRef}
          role="status"
          tabIndex={-1}
          // scroll-mt keeps it clear of a sticky header when focus scrolls to it.
          className="flex scroll-mt-24 gap-3 rounded-md border border-primary bg-primary/10 p-4 focus:outline-none"
        >
          <CheckCircleIcon width={20} height={20} className="mt-0.5 shrink-0 text-primary" />
          <div>
            <p className="font-semibold">Profile saved</p>
            <p className="mt-1">
              Your changes have been saved.{" "}
              <Link
                href={publicHref}
                className="font-medium text-primary underline hover:text-primary-hover"
              >
                View your public profile
              </Link>
            </p>
          </div>
        </div>
      )}

      <fieldset disabled={saving} className="flex min-w-0 flex-col gap-6">
        {formError && (
          <p
            role="alert"
            className="flex items-center gap-2 rounded-md border border-error px-3 py-2 text-error"
          >
            <AlertCircleIcon className="shrink-0" />
            {formError}
          </p>
        )}

        <Input
          id={fieldId("name")}
          label="Name"
          value={values.name}
          onChange={(e) => set("name")(e.target.value)}
          error={errors.name}
          maxLength={NAME_MAX}
          autoComplete="name"
          required
        />

        <Select
          id={fieldId("neighborhood")}
          label="Neighborhood"
          options={neighborhoods}
          placeholder="Choose your neighborhood"
          value={values.neighborhood}
          onChange={(e) => set("neighborhood")(e.target.value)}
          error={errors.neighborhood}
          required
        />

        <Textarea
          id={fieldId("bio")}
          label="Short bio"
          hint={`Optional. Tell your neighbors a little about yourself. Up to ${BIO_MAX} characters.`}
          value={values.bio}
          onChange={(e) => set("bio")(e.target.value)}
          error={errors.bio}
          maxLength={BIO_MAX}
          rows={4}
        />

        <fieldset className="flex flex-col gap-6 rounded-lg border border-border p-4">
          <legend className="px-1 font-semibold">Contact details (private)</legend>
          <p className="-mt-2 text-sm text-muted">
            Only shown to a neighbor after you approve their borrow request.
          </p>

          <Input
            id={fieldId("email")}
            label="Email"
            type="email"
            value={values.email}
            onChange={(e) => set("email")(e.target.value)}
            error={errors.email}
            maxLength={EMAIL_MAX}
            autoComplete="email"
            required
          />

          {emailChanged && (
            <Input
              id={fieldId("currentPassword")}
              label="Current password"
              hint="Your email is how you sign in, so we need your password to change it."
              type="password"
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                if (errors.currentPassword) {
                  setErrors((er) => ({ ...er, currentPassword: undefined }));
                }
              }}
              error={errors.currentPassword}
              autoComplete="current-password"
              required
            />
          )}

          <Input
            id={fieldId("phone")}
            label="Phone"
            hint="Optional. For example +27 82 555 0101."
            type="tel"
            value={values.phone}
            onChange={(e) => set("phone")(e.target.value)}
            error={errors.phone}
            maxLength={PHONE_MAX}
            autoComplete="tel"
          />
        </fieldset>

        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit">{saving ? "Saving…" : "Save changes"}</Button>
          {/* Only shown when there is something to discard. */}
          {hasChanges && (
            <Button variant="secondary" onClick={discardChanges}>
              Discard changes
            </Button>
          )}
          <Link href={publicHref} className="font-medium text-primary underline hover:text-primary-hover">
            View your public profile
          </Link>
        </div>
      </fieldset>
    </form>
  );
}
