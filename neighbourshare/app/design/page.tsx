import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { REQUEST_STATUSES } from "@/lib/domain";

// Colors come from the CSS variables in app/globals.css, so this page always
// shows the current palette for both light and dark mode.
const palette = [
  { name: "Page background", token: "--background", use: "Page background" },
  { name: "Surface", token: "--surface", use: "Cards & forms" },
  { name: "Text", token: "--foreground", use: "Headings & body" },
  { name: "Muted text", token: "--muted", use: "Labels & captions" },
  { name: "Primary", token: "--primary", use: "Buttons, links, brand" },
  {
    name: "Primary hover",
    token: "--primary-hover",
    use: "Hover & pressed states",
  },
  {
    name: "Accent",
    token: "--accent",
    use: "Highlights (fill only, not text)",
  },
  { name: "Error", token: "--error", use: "Errors & rejected" },
  { name: "Warning", token: "--warning", use: "Warnings & pending" },
  { name: "Info / focus", token: "--info", use: "Focus ring & info" },
  { name: "Input border", token: "--input-border", use: "Form field borders" },
  { name: "Border", token: "--border", use: "Card borders & dividers" },
];

export default function DesignPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-12 text-foreground">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-2 text-3xl font-bold text-primary">
          NeighbourShare Design System
        </h1>
        <p className="mb-12 text-muted">
          Colors and shared components. Switch your system to dark mode to see
          the dark colors.
        </p>

        <h2 className="mb-6 text-2xl font-semibold">Palette</h2>
        <div className="mb-12 grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-6">
          {palette.map((c) => (
            <div
              key={c.name}
              className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm"
            >
              <div
                className="h-24 border-b border-border"
                style={{ background: `var(${c.token})` }}
              />
              <div className="p-4">
                <h3 className="text-lg font-semibold">{c.name}</h3>
                <p className="font-mono text-sm">{c.token}</p>
                <p className="text-sm text-muted">{c.use}</p>
              </div>
            </div>
          ))}
        </div>

        <h2 className="mb-6 text-2xl font-semibold">Buttons</h2>
        <div className="mb-12 flex flex-wrap gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button disabled>Disabled</Button>
          <Button variant="secondary" disabled>
            Disabled secondary
          </Button>
        </div>

        <h2 className="mb-6 text-2xl font-semibold">Inputs</h2>
        <div className="mb-12 grid max-w-md gap-6">
          <Input label="Title" name="title" placeholder="Cordless drill" />
          <Input
            label="Password"
            name="password"
            type="password"
            hint="At least 8 characters"
          />
          <Input
            label="Email"
            name="email"
            type="email"
            defaultValue="not-an-email"
            error="Enter a valid email address"
          />
        </div>

        <h2 className="mb-6 text-2xl font-semibold">Card</h2>
        <div className="mb-12 grid max-w-sm">
          <Card image={{ src: "/seed-item.svg", alt: "Cordless drill" }}>
            <h3 className="text-lg font-semibold">Cordless drill</h3>
            <p className="text-sm text-muted">Tools · Good · Lynnwood</p>
          </Card>
        </div>

        <h2 className="mb-6 text-2xl font-semibold">Status badges</h2>
        <ul className="flex flex-wrap gap-3">
          {REQUEST_STATUSES.map((status) => (
            <li key={status}>
              <StatusBadge status={status} />
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
