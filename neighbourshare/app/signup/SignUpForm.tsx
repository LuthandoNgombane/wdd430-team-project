'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';
import type { FieldErrors, SignUpField } from '@/lib/validation';

const FIELD_ORDER: SignUpField[] = ['name', 'email', 'password', 'neighborhood'];

const inputClass =
  'w-full rounded-md border border-input-border bg-surface px-3 py-2 text-foreground aria-[invalid=true]:border-error';

function ErrorMessage({ field, errors, emailTaken }: { field: SignUpField; errors: FieldErrors; emailTaken: boolean }) {
  if (!errors[field]) return null;
  return (
    <p id={`${field}-error`} className="mt-1 text-sm text-error">
      {errors[field]}
      {field === 'email' && emailTaken && (
        <>
          {' '}
          <Link href="/signin" className="font-medium underline">
            Sign in instead
          </Link>
        </>
      )}
    </p>
  );
}

export default function SignUpForm({ neighborhoods }: { neighborhoods: string[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [emailTaken, setEmailTaken] = useState(false);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Move keyboard focus to the first field with a problem.
  function focusFirstError(fieldErrors: FieldErrors) {
    const first = FIELD_ORDER.find((field) => fieldErrors[field]);
    if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFormError('');
    setEmailTaken(false);

    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const result = await response.json().catch(() => ({}));

      if (response.status === 201) {
        router.push('/signin?registered=1');
        return;
      }
      if (result.errors) {
        setErrors(result.errors);
        setEmailTaken(result.code === 'EMAIL_TAKEN');
        focusFirstError(result.errors);
      } else {
        setErrors({});
        setFormError(result.message ?? 'Something went wrong. Please try again.');
      }
    } catch {
      setFormError('Could not reach the server. Check your connection and try again.');
    }
    setSubmitting(false);
  }

  // Connects an input to its error message for screen readers.
  function errorProps(field: SignUpField) {
    return errors[field]
      ? { 'aria-invalid': true as const, 'aria-describedby': `${field}-error` }
      : { 'aria-invalid': false as const };
  }

  const errorCount = Object.keys(errors).length;

  return (
    // noValidate: the server's messages are shown instead of the browser's pop-ups.
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-5">
      <div role="alert" aria-live="assertive">
        {errorCount > 0 && (
          <p className="rounded-md border border-error p-3 text-sm text-error">
            Please fix {errorCount === 1 ? 'the highlighted field' : `the ${errorCount} highlighted fields`}.
          </p>
        )}
        {formError && <p className="rounded-md border border-error p-3 text-sm text-error">{formError}</p>}
      </div>

      <div>
        <label htmlFor="name" className="mb-1 block font-medium">
          Name
        </label>
        <input id="name" name="name" type="text" autoComplete="name" required maxLength={100} className={inputClass} {...errorProps('name')} />
        <ErrorMessage field="name" errors={errors} emailTaken={emailTaken} />
      </div>

      <div>
        <label htmlFor="email" className="mb-1 block font-medium">
          Email
        </label>
        <input id="email" name="email" type="email" autoComplete="email" required maxLength={254} className={inputClass} {...errorProps('email')} />
        <ErrorMessage field="email" errors={errors} emailTaken={emailTaken} />
      </div>

      <div>
        <label htmlFor="password" className="mb-1 block font-medium">
          Password
        </label>
        <p id="password-hint" className="mb-1 text-sm text-muted">
          At least 8 characters.
        </p>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={inputClass}
          {...errorProps('password')}
          aria-describedby={errors.password ? 'password-hint password-error' : 'password-hint'}
        />
        <ErrorMessage field="password" errors={errors} emailTaken={emailTaken} />
      </div>

      <div>
        <label htmlFor="neighborhood" className="mb-1 block font-medium">
          Neighborhood
        </label>
        <select id="neighborhood" name="neighborhood" required defaultValue="" className={inputClass} {...errorProps('neighborhood')}>
          <option value="" disabled>
            Choose your neighborhood
          </option>
          {neighborhoods.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <ErrorMessage field="neighborhood" errors={errors} emailTaken={emailTaken} />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-primary px-4 py-2 font-semibold text-on-primary hover:bg-primary-hover disabled:opacity-60"
      >
        {submitting ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  );
}