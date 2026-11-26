'use client';

import { useActionState, useEffect, useRef } from 'react';
import { authenticate, type SignInState } from './actions';

const inputClass =
  'w-full rounded-md border border-input-border bg-surface px-3 py-2 text-foreground aria-[invalid=true]:border-error';

export default function SignInForm({ redirectTo }: { redirectTo: string }) {
  const [state, formAction, pending] = useActionState<SignInState, FormData>(authenticate, {});
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.errors?.email || state.message) emailRef.current?.focus();
    else if (state.errors?.password) passwordRef.current?.focus();
  }, [state]);

  return (
    <form action={formAction} noValidate className="space-y-5">
      <input type="hidden" name="redirectTo" value={redirectTo} />

      <div role="alert" aria-live="assertive">
        {state.message && <p className="rounded-md border border-error p-3 text-sm text-error">{state.message}</p>}
      </div>

      <div>
        <label htmlFor="email" className="mb-1 block font-medium">
          Email
        </label>
        <input
          ref={emailRef}
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={state.email}
          required
          className={inputClass}
          aria-invalid={Boolean(state.errors?.email || state.message)}
          aria-describedby={state.errors?.email ? 'email-error' : undefined}
        />
        {state.errors?.email && (
          <p id="email-error" className="mt-1 text-sm text-error">
            {state.errors.email}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="mb-1 block font-medium">
          Password
        </label>
        <input
          ref={passwordRef}
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
          aria-invalid={Boolean(state.errors?.password || state.message)}
          aria-describedby={state.errors?.password ? 'password-error' : undefined}
        />
        {state.errors?.password && (
          <p id="password-error" className="mt-1 text-sm text-error">
            {state.errors.password}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-primary px-4 py-2 font-semibold text-on-primary hover:bg-primary-hover disabled:opacity-60"
      >
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}