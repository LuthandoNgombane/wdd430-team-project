import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AccountLinks } from "@/components/layout/account-links";
import { Container } from "@/components/layout/container";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "NeighbourShare", template: "%s | NeighbourShare" },
  description: "Borrow and lend items with your neighbours.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-4 focus:py-3 focus:font-semibold focus:text-on-primary"
        >
          Skip to content
        </a>
        <Suspense
          fallback={
            <header className="sticky top-0 z-50 border-b border-border bg-surface">
              <Container className="flex h-16 items-center">
                <span className="text-xl font-semibold text-primary">NeighbourShare</span>
              </Container>
            </header>
          }
        >
          <Header
            accountLinks={
              // The session is read per request, so it loads after the header shell.
              <Suspense fallback={<span className="h-11" />}>
                <AccountLinks />
              </Suspense>
            }
          />
        </Suspense>
        <main id="main-content" tabIndex={-1} className="flex-1 py-8 focus:outline-none">
          <Container>{children}</Container>
        </main>
        <Footer />
      </body>
    </html>
  );
}