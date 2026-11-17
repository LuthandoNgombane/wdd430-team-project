This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## PostgreSQL setup (issues #10 and #11)

Requires Node.js 20.12+ and PostgreSQL (Neon recommended). Run commands from `neighbourshare/`.

1. Create a Neon project and database. In **Connect**, select the pooled connection URL. Use a separate development database for demo data.
2. Copy `.env.example` to `.env.local` and set `DATABASE_URL` to that URL, keeping `sslmode=require`. Never commit this file. Share credentials privately through your team's chosen secure channel.
3. Run `npm ci`, then `npm run db:check` and `npm run db:migrate`.
4. The authoritative spec still leaves the eight neighborhood names TBD. Replace the empty array in `db/neighborhoods.json` with the team's **eight agreed, distinct names** before seeding. The seed command deliberately refuses an empty or invalid list. Do not use guessed names. The neighborhoods table supplies form/validation options until the spec is finalized; a literal TypeScript neighborhood union must be added with the agreed list.
5. Set a development-only `SEED_PASSWORD` (at least 8 characters, at most 72 UTF-8 bytes) in `.env.local`, then run `npm run seed`. This also applies the migration on an empty database.
6. Run `npm run dev`. Server modules can import `getDb` and `withTransaction` from `@/lib/db`. Use parameterized queries (`$1`, `$2`, etc.). For transactions, use only the callback's client.

The schema creates `users`, `listings`, `borrow_requests`, a neighborhood lookup table, and a migration ledger. Migrations run once under a transaction/advisory lock. They do not drop or reset existing data; an unrelated existing schema needs manual review before adoption.

The seed creates three demo accounts (`demo1@example.com`, `demo2@example.com`, `demo3@example.com`), eight listings spanning every category and neighborhood, and requests in all five stored statuses. Passwords use bcrypt. Rerunning preserves existing demo records and passwords; changing SEED_PASSWORD does not reset them. Demo photos use a local SVG placeholder for reliable rendering; real listing uploads must still enforce the JPEG/PNG/WebP limits in issue #19.

Categories, conditions and stored request statuses exactly match the specification. `rating` accepts NULL or integer 1–5. Whole-day ranges use PostgreSQL `date`, with start <= end. `expired` is derived from pending requests whose start date has passed; it is never stored. The spec does not enumerate user/listing status values, so this setup uses `active` and `inactive` with `active` as the default.

Foreign keys preserve references, email uniqueness ignores case and surrounding whitespace, and application code is server-only. Authorization, privacy-safe response fields, ownership checks, overlap prevention and allowed status transitions remain the responsibility of their API issues (#18, #22–#28); this schema does not implement those endpoints. Never return password hashes or private contact fields in public queries.

For Vercel, set DATABASE_URL separately in the intended environment(s), using isolated preview/development data where possible. SEED_PASSWORD is only needed by the seed command, not the running app. Do not seed automatically during builds.

### Verification

`npm run test:db` runs the migration and seed twice in an isolated PGlite PostgreSQL engine and verifies counts, bcrypt passwords, domains, unique emails, foreign keys, dates and rating bounds. It uses fictional neighborhood fixtures, never a live Neon database. Also run `npx tsc --noEmit` and `npm run lint`.

Live Neon acceptance still requires a connected Neon project, the finalized neighborhood names, and successful `db:check`, `db:migrate`, and `seed` against the development database. Do not mark issues #10/#11 fully complete until those steps pass.
