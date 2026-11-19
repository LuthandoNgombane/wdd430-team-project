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

const statuses = [
  { name: "Pending", token: "--warning" },
  { name: "Approved", token: "--primary" },
  { name: "Rejected", token: "--error" },
  { name: "Cancelled", token: "--muted" },
  { name: "Completed", token: "--info" },
];

export default function DesignPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-12 text-foreground">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-2 text-3xl font-bold text-primary">
          NeighbourShare Design System
        </h1>
        <p className="mb-12 text-muted">
          Color palette. Switch your system to dark mode to see the dark colors.
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

        <h2 className="mb-6 text-2xl font-semibold">Request status colors</h2>
        <ul className="flex flex-wrap gap-3">
          {statuses.map((s) => (
            <li
              key={s.name}
              className="rounded-full border-2 bg-surface px-3 py-1 text-sm font-medium"
              style={{
                borderColor: `var(${s.token})`,
                color: `var(${s.token})`,
              }}
            >
              {s.name} · {s.token}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
