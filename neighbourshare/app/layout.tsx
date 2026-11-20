import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import Container from "@/components/layout/container";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "NeighbourShare", template: "%s | NeighbourShare" },
  description: "Lend and borrow high-cost items with your neighbours.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // TODO (Sione's auth work): replace with `const session = await auth()`
  const isSignedIn = false;

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} flex min-h-screen flex-col bg-background font-sans text-foreground antialiased`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-4 focus:py-3 focus:font-semibold focus:text-primary-foreground"
        >
          Skip to content
        </a>
        <Header isSignedIn={isSignedIn} />
        <main id="main-content" tabIndex={-1} className="flex-1 py-8 focus:outline-none">
          <Container>{children}</Container>
        </main>
        <Footer />
      </body>
    </html>
  );
}