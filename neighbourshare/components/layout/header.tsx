"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import Container from "./container";

const NAV_LINKS = [
  { href: "/listings", label: "Browse" },
  { href: "/dashboard", label: "Dashboard" },
];

export default function Header({ isSignedIn = false }: { isSignedIn?: boolean }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  const authLink = isSignedIn
    ? { href: "/api/auth/signout", label: "Sign out" }
    : { href: "/signin", label: "Sign in" };
  const links = [...NAV_LINKS, authLink];

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape" && open) {
      setOpen(false);
      buttonRef.current?.focus();
    }
  }

  return (
    <header
      onKeyDown={handleKeyDown}
      className="sticky top-0 z-50 border-b border-border bg-surface"
    >
      <Container className="flex h-16 items-center justify-between">
        <Link href="/" className="min-w-0 truncate text-xl font-semibold text-primary">
          NeighbourShare
        </Link>

        {/* Desktop navigation */}
        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-6">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={isActive(link.href) ? "page" : undefined}
                  className="inline-flex min-h-11 items-center font-semibold text-foreground hover:text-primary aria-[current=page]:text-primary aria-[current=page]:underline underline-offset-4"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Mobile menu button */}
        <button
          ref={buttonRef}
          type="button"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((o) => !o)}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border text-foreground md:hidden"
        >
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {open ? (
              <path d="M6 6l12 12M18 6L6 18" />
            ) : (
              <path d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </Container>

      {/* Mobile menu panel */}
      {open && (
        <nav id="mobile-menu" aria-label="Main" className="border-t border-border bg-surface md:hidden">
          <Container>
            <ul className="flex flex-col py-2">
              {links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    aria-current={isActive(link.href) ? "page" : undefined}
                    className="flex min-h-11 items-center font-semibold text-foreground aria-[current=page]:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </Container>
        </nav>
      )}
    </header>
  );
}