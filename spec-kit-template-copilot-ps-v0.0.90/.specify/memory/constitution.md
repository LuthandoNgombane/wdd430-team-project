<!--
Sync Impact Report
- Version change: unratified template -> 1.0.0 (initial adoption)
- Principles established: Community Trust and Stewardship; Strict TypeScript;
	App Router and Component Boundaries; Utility-First, Accessible UI;
	Tested, Reviewable Delivery
- Added sections: Technical Standards; Collaboration and Delivery
- Removed sections: None
- Synchronized: .specify/templates/plan-template.md (updated);
	.specify/templates/tasks-template.md (updated);
	.github/agents/speckit.tasks.agent.md (updated)
- Reviewed with no changes: .specify/templates/spec-template.md;
	.github/agents/speckit.plan.agent.md
- Pending: .specify/templates/commands/ does not exist in this repository;
	no README.md or docs/quickstart.md is present
- Deferred TODOs: None
-->
# Community Sharing Hub Constitution

## Core Principles

### I. Community Trust and Stewardship
The product MUST make lending terms, item condition, availability, and pickup and
return expectations clear to members. Features handling member or item data MUST
protect private information and authorize actions for the relevant member. Flows
for high-cost or specialty items MUST account for safe handoff and responsible
return. These rules make sharing dependable without implying unverified legal,
insurance, or safety guarantees.

### II. Strict TypeScript
Application code MUST use TypeScript with strict compiler checking enabled and
MUST NOT use the `any` type. Use `unknown` with narrowing when a value is not yet
known, and define types at data and component boundaries. This keeps member,
listing, and borrowing state explicit as the product evolves.

### III. App Router and Component Boundaries
The application MUST use Next.js App Router file-based routing. Components MUST
be Server Components by default; mark a component with `use client` only when
interactive state, event handling, or a browser-only API requires it. Keep data
access and authorization on the server, and pass only the data needed by client
components. These boundaries reduce unnecessary client code and help protect
member data.

### IV. Utility-First, Accessible UI
UI styling MUST use Tailwind CSS utility classes by default. Custom CSS is
permitted only when the design cannot be expressed clearly with existing
utilities or a shared reusable pattern; document that reason in the change.
Interactive controls and member workflows MUST be usable with keyboard input,
have clear labels and states, and preserve readable responsive layouts. This
keeps the interface consistent and usable across a varied local community.

### V. Tested, Reviewable Delivery
Every change to behavior MUST include automated tests at the appropriate level:
unit tests for isolated logic, integration tests for component or data
boundaries, and end-to-end tests for critical member journeys. Changes MUST pass
the available test, lint, and TypeScript checks before merge. A test exception
MUST state the risk, reason, and compensating verification in the plan or review.
Tests keep lending, borrowing, and return workflows dependable as they change.

## Technical Standards

- The required application stack is Next.js App Router, TypeScript, and Tailwind
	CSS. Keep TypeScript `strict` enabled; do not introduce `any`, including in
	tests or temporary glue code.
- Follow App Router conventions for route segments, layouts, loading and error
	boundaries, and route handlers. Keep server-only modules separate from client
	modules and do not expose secrets or privileged data to the browser.
- Use Tailwind utilities in markup and shared component patterns. Add custom
	CSS only for a documented need that utilities cannot reasonably meet; avoid
	one-off styling systems that compete with Tailwind.
- Use `PascalCase` for React components and type/interface names, `camelCase`
	for variables and functions, and lowercase kebab-case for route segments and
	non-component filenames unless a framework convention requires another form.
	Name files and exports for their domain purpose, such as `item-listing` or
	`BorrowRequest`.
- Validate data at external boundaries and represent meaningful domain states
	explicitly, including item condition, availability, and request status where
	applicable. Never treat client-side checks as authorization.
- Tests MUST cover changed behavior, including relevant success, failure, and
	boundary cases. Critical member journeys such as listing, requesting,
	arranging handoff, and recording return require end-to-end coverage when
	those journeys are implemented. Keep tests deterministic and isolated from
	real member data.

## Collaboration and Delivery

- Work from a focused issue or specification with observable acceptance criteria.
	Break work into reviewable changes and identify ownership when multiple
	contributors touch the same workflow or files.
- Before implementation, agree on shared types, route contracts, and component
	boundaries when a change spans contributors. Communicate contract changes and
	resolve conflicts before merging parallel work.
- Every change MUST receive review by another contributor before merge. Reviewers
	MUST check constitution compliance, privacy and authorization impact, test
	coverage, and accessibility for changed UI.
- Run the repository's available tests, lint, and type checks before requesting
	review. Document exceptions, important technical decisions, and any remaining
	risks in the pull request or relevant project documentation.

## Governance

This constitution governs feature specifications, plans, tasks, implementation,
and reviews. Contributors MUST resolve conflicts in favor of these principles
or propose an explicit amendment before proceeding. Amendments require a written
rationale, review by the project maintainers, updates to affected templates and
guidance, and a new last-amended date. Use semantic versioning: MAJOR for
backward-incompatible governance changes, MINOR for added principles or
materially expanded requirements, and PATCH for clarifications that do not
change obligations. Plans and reviews MUST verify compliance; any exception
requires a documented justification and compensating safeguards. Maintainers
are responsible for periodically checking that templates and runtime guidance
remain consistent with this constitution.

**Version**: 1.0.0 | **Ratified**: 2026-11-06 | **Last Amended**: 2026-11-06
