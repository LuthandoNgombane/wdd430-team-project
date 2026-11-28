"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { Container } from "./container";

const NAV_LINKS = [
  { href: "/listings", label: "Browse" },
  { href: "/dashboard", label: "Dashboard" },
];

type HeaderProps = {
  accountLinks: ReactNode;
};

export function Header({ accountLinks }: HeaderProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  // Close the mobile menu whenever the page changes 
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

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
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link href="/" className="min-w-0 truncate text-xl font-semibold text-primary">
          NeighbourShare
        </Link>

        {/* Desktop navigation and account links */}
        <div className="hidden items-center gap-6 md:flex">
          <nav aria-label="Main">
            <ul className="flex items-center gap-6">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={isActive(link.href) ? "page" : undefined}
                    className="inline-flex min-h-11 items-center font-semibold text-foreground underline-offset-4 hover:text-primary-hover aria-[current=page]:text-primary aria-[current=page]:underline"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex items-center gap-4">{accountLinks}</div>
        </div>

        {/* Mobile menu button */}
        <button
          ref={buttonRef}
          type="button"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((o) => !o)}
          className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md border border-input-border text-foreground md:hidden"
        >
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          <svg
            aria-hidden="true"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            {open ? (
              <path d="M6 6l12 12M18 6L6 18" />
            ) : (
              <path d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </Container>

      {/* Mobile menu panel: always in the page, so aria-controls always points at something */}
      <div
        id="mobile-menu"
        hidden={!open}
        className="border-t border-border bg-surface md:hidden"
      >
        <Container>
          <nav aria-label="Main">
            <ul className="flex flex-col py-2">
              {NAV_LINKS.map((link) => (
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
          </nav>
          <div className="flex flex-col items-start gap-3 border-t border-border py-3">
            {accountLinks}
          </div>
        </Container>
      </div>
    </header>
  );
}