const palette = [
  { name: "Primary", hex: "#2F6B4F", use: "Buttons, links, brand" },
  { name: "Primary hover", hex: "#24543E", use: "Hover & pressed states" },
  { name: "Accent", hex: "#C2410C", use: "Key calls to action" },
  { name: "Text", hex: "#1F2937", use: "Headings & body" },
  { name: "Muted text", hex: "#5B6472", use: "Labels & captions" },
  { name: "Page background", hex: "#FAF8F3", use: "Page background" },
  { name: "Surface", hex: "#FFFFFF", use: "Cards & forms" },
  { name: "Border", hex: "#E5E1D8", use: "Borders & dividers" },
];

const statuses = [
  { name: "Pending", hex: "#A16207" },
  { name: "Approved", hex: "#15803D" },
  { name: "Rejected", hex: "#B91C1C" },
  { name: "Cancelled", hex: "#5B6472" },
  { name: "Expired", hex: "#5B6472" },
  { name: "Completed", hex: "#1D4ED8" },
];

export default function DesignPage() {
  return (
    <main style={{ background: "#FAF8F3", color: "#1F2937", minHeight: "100vh", padding: "48px 16px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "#2F6B4F", marginBottom: 8 }}>
          NeighbourShare Design System
        </h1>
        <p style={{ color: "#5B6472", marginBottom: 48 }}>Design system: color palette</p>

        <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: 24 }}>Palette</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 24, marginBottom: 48 }}>
          {palette.map((c) => (
            <div key={c.name} style={{ background: "#FFFFFF", border: "1px solid #E5E1D8", borderRadius: 8, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
              <div style={{ background: c.hex, height: 96, borderBottom: "1px solid #E5E1D8" }} />
              <div style={{ padding: 16 }}>
                <h3 style={{ fontSize: "1.125rem", fontWeight: 600 }}>{c.name}</h3>
                <p style={{ fontFamily: "monospace", fontSize: "0.875rem" }}>{c.hex}</p>
                <p style={{ color: "#5B6472", fontSize: "0.875rem" }}>{c.use}</p>
              </div>
            </div>
          ))}
        </div>

        <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: 24 }}>Request status badges</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {statuses.map((s) => (
            <span key={s.name} style={{ background: s.hex, color: "#FFFFFF", padding: "4px 12px", borderRadius: 999, fontSize: "0.875rem", fontWeight: 500 }}>
              {s.name} · {s.hex}
            </span>
          ))}
        </div>
      </div>
    </main>
  );
}