# Copilot Instructions for NeighbourShare

## Repository layout

- The application is in `neighbourshare/`. Run application, test, and database commands from this directory.
- The feature specification is in `../spec-kit-template-copilot-ps-v0.0.90/specs/001-community-sharing-hub/spec.md` (relative to this file).
- Project governance is in `spec-kit-template-copilot-ps-v0.0.90/.specify/memory/constitution.md`.
- When implementing or reviewing a feature, treat the specification and constitution as authoritative.
- Use the GitHub repository at `https://github.com/LuthandoNgombane/wdd430-team-project` and project board at `https://github.com/users/LuthandoNgombane/projects/3/views/1` for issue and delivery context.
- App Router pages and route handlers are under `neighbourshare/app/`.
- Shared React components are under `neighbourshare/components/`; listing-specific components are in `components/listings/` and reusable UI primitives are in `components/ui/`.
- Server-only database and domain logic is under `neighbourshare/lib/`.
- Database migrations, seeds, and setup scripts are under `neighbourshare/db/` and `neighbourshare/scripts/`.

## Scope and priority

- P1: member registration and sign-in, member profile, listing create/edit/delete, public browsing filtered by neighborhood and category, borrow requests with approve/reject/cancel actions, and the reservation dashboard.
- P2: mark an item as returned and email verification.
- Out of scope: distance or map search, rating screens, moderation, pickup addresses, account deletion, payments, and availability-date filtering.
- Ratings are limited to a nullable integer database field from 1 to 5; do not build rating UI or endpoints.

## Team responsibilities

- Luthando Ngombane: PostgreSQL setup, users/listings/borrow_requests tables, neighborhoods test data, and Vercel deployment.
- Sione Uhlig: authentication, sign-up/sign-in/sign-out with Auth.js, and protection of member-only pages.
- Andrea González: design system and layout, navigation, footer, and shared components.
- Alexander Mendoza: specification and scope, listing create/edit/delete API, listing form with photo upload, and browse filters.

Maintain these ownership boundaries. Coordinate API contracts and shared components when a change spans responsibilities.

## Project conventions

- Use Next.js App Router, strict TypeScript, React 19, Tailwind CSS, and PostgreSQL.
- Keep Server Components as the default. Add `"use client"` only for state, event handling, or browser APIs.
- Keep database access and authorization in server modules. Do not expose secrets, password hashes, or private contact details.
- Do not use `any`. Use explicit types and `unknown` with narrowing where values are not yet validated.
- Use `PascalCase` for React components and type/interface names, `camelCase` for functions and variables, and lowercase kebab-case for route segments and non-component filenames.
- TypeScript API and component fields use camelCase, such as `photoUrl`, `availableFrom`, `availableTo`, `ownerId`, and `startDate`.
- PostgreSQL columns use snake_case, such as `photo_url`, `available_from`, `available_to`, `owner_id`, and `start_date`.
- Map between database and application names explicitly in query aliases or row-to-domain conversion code; do not expose raw database row shapes as public API types.
- Follow existing aliases and patterns, especially imports through `@/`.
- Use parameterized PostgreSQL queries through the existing database helpers. Do not concatenate SQL or bypass transaction-client rules.
- Validate external input at API and form boundaries. Client checks are not authorization or validation on their own.
- Use Tailwind utility classes for UI. Custom CSS is allowed only for a pattern that utilities cannot express reasonably.
- Implement route handlers under `/api/users`, `/api/listings`, and `/api/requests`.
- `/api/listings` and `/api/listings/[id]` currently implement public browsing plus owner-only create, update, and delete behavior.
- `/api/uploads` supports listing photo upload and `/api/users` plus `/api/requests` remain planned surfaces unless the working tree explicitly contains implementation.

## Next.js-specific guidance

This workspace uses Next.js 16.4.5. Before changing framework-sensitive code, read the relevant local documentation in `neighbourshare/node_modules/next/dist/docs/`. Heed breaking-change and deprecation guidance rather than relying on older Next.js assumptions.

## Domain rules

- CATEGORIES are fixed in `neighbourshare/lib/domain.ts`: Tools, Garden & Yard, Outdoor & Camping, Sports & Fitness, Electronics, Kitchen & Appliances, Party & Events, and Other.
- CONDITIONS are fixed in `neighbourshare/lib/domain.ts`: New, Like new, Good, and Fair.
- Stored borrow-request statuses are `pending`, `approved`, `rejected`, `cancelled`, and `completed`; `expired` is derived and never stored.
- Use `rejected`, not `declined`, for refused requests.
- Listings have exactly one photo, at most 5 MB, with JPEG, PNG, or WebP format.
- Availability is one inclusive whole-day range (`start_date <= end_date`).
- When editing availability, block changes that overlap an approved borrow. If a change would invalidate a pending request, clearly notify both participants; do not silently approve or discard the request.
- Browsing filters are neighborhood and category only; distance filtering and availability-date filtering are out of scope.
- Pending requests expire once their start date has passed.
- Ratings exist only as a nullable database integer from 1 to 5. Do not add rating screens or endpoints.
- Logged-out visitors may browse listings, but member actions require authentication.
- Private contact details are revealed only through the approved-borrow flow.

## Data model

- User: `id`, `name`, `email`, `password_hash`, `neighborhood`, `bio`, `phone`, `email_verified`, `status`, and `created_at` in PostgreSQL. Email is unique case-insensitively; phone is optional/private; bio is stored as text and defaults to an empty string.
- Listing: `id`, `owner_id`, `title`, `description`, `photo_url`, `category`, `condition`, `neighborhood`, `available_from`, `available_to`, `status`, and `created_at`.
- BorrowRequest: `id`, `listing_id`, `borrower_id`, `start_date`, `end_date`, `message`, `status`, `rating`, and `created_at`.
- A User owns many Listings. A Listing has many BorrowRequests. A User as borrower makes many BorrowRequests.
- Members cannot request their own listing.
- Approved requests for the same listing must not overlap by date.
- Return `rejected` for refused requests.
- The fixed neighborhood list has exactly eight names, with two contributed by each team member. Do not guess or replace it with a distance-based location model.

## Database and security

- Never commit `.env.local`, credentials, or live database URLs.
- Keep `DATABASE_URL`, database passwords, seed passwords, and API credentials out of source files and documentation. Use `.env.local` or the platform's secret configuration.
- Preserve migration safety: migrations must be repeatable and must not drop or reset unrelated data.
- Use existing `getDb` and `withTransaction` helpers from `@/lib/db`.
- Implement ownership and authorization checks for every member-only operation.
- Prevent approved-overlap conflicts and rejected/cancelled/expired invalid transitions.
- Never return password hashes or private contact fields in public responses.

## Design system

- Use warm neutral surfaces with community green as the primary brand color.
- Preserve WCAG 2.2 AA contrast in every color pair and AAA body-text contrast. Use the planned palette unless an accessibility-preserving approved change is needed.
- Light mode: background `#FAFAF9`, surface `#FFFFFF`, body text `#1C1917`, muted text `#57534E`, primary `#166534`, primary hover `#14532D`, accent `#F59E0B`, error `#B91C1C`, warning `#B45309`, focus/info `#1D4ED8`, and input border `#78716C`.
- Dark mode: background `#1C1917`, surface `#292524`, body text `#F5F5F4`, muted text `#A8A29E`, primary `#4ADE80`, primary hover `#86EFAC`, accent `#FBBF24`, error `#F87171`, warning `#FBBF24`, focus/info `#93C5FD`, and input border `#78716C`.
- Follow the operating system `prefers-color-scheme` setting for dark mode.
- Never communicate status by color alone. Request badges include a text label and icon for Pending, Approved, Rejected, Cancelled, and Completed.
- Every interactive element has a visible 2px focus outline in the focus color with a 2px offset.
- Use Geist Sans for text and Geist Mono for code or IDs through Next.js `next/font`.
- Use type sizes 12, 14, 16, 20, 25, 31, and 39px with rem units. Use 400 weight for body text, 600 for headings and buttons, and 700 only for h1.
- Use 1.5 line height for body text and 1.2 for headings. Limit paragraphs to roughly 65-75 characters.
- Use an 8-point spacing grid: 8, 16, 24, 32, 48, and 64px. Use 16px for related elements, 32px between groups, and 64px between page sections.
- Use mobile-first Tailwind breakpoints: 640px, 768px, 1024px, and 1280px.
- Center content at a maximum width of 1152px. Use 16px side padding on mobile, 24px on tablet, and 32px on desktop.
- Listing grids use 1 column mobile, 2 at small screens, 3 at laptop, and 4 at large desktop, with 24px gaps.
- Cards use an 8px corner radius, 16px padding, 1px border, subtle shadow, and fixed 4:3 photo area.
- Forms use 6px field/button corner radius and controls at least 44px tall. Put a visible label above every field; placeholders are not labels.
- Place field errors below the field in the error color with an icon.
- Use a sticky header containing the logo, Browse, Dashboard, and Sign in. Collapse navigation links into a menu button on mobile.
- Pages use one h1, never skip heading levels, and keep layouts keyboard accessible and readable at 200% zoom.

## Testing and verification

Before requesting review, run the smallest relevant checks and then the standard application checks:

```bash
cd neighbourshare
npm run test:db
npm run test:listings
npm run test:profiles
npx tsc --noEmit
npm run lint
npm run build
```

Database tests use PGlite and seed fixtures; they do not require a live Neon database. Do not run live seeding or migrations unless explicitly requested and use only isolated development data.

For every behavior change, add or update automated tests covering success, failure, authorization, validation, and relevant boundary cases.
