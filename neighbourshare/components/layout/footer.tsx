import { Container } from "./container";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border bg-surface">
      <Container className="py-8 text-sm text-muted">
        <p>© 2026 NeighbourShare. Borrow locally, buy less.</p>
      </Container>
    </footer>
  );
}