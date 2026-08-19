# Phase 1 — Foundation

## Goal
Create a clean, runnable Next.js + Supabase foundation without implementing business features yet.

## Included
- Next.js App Router + TypeScript
- Tailwind CSS v4 using the PostCSS plugin
- Responsive baseline for phone, tablet and desktop
- Browser and server Supabase clients
- Supabase session middleware
- Foundation SQL migration
- `businesses`, `profiles` and `audit_logs` tables
- `admin`, `staff`, `user` roles
- Row-level security primitives
- Automatic `updated_at` timestamps
- No GST/tax fields or calculations

## Local setup

```powershell
git clone https://github.com/HBHATIA80/pos.git
cd pos
git checkout phase-1-foundation
npm install
```

Create `.env.local` from `.env.example` and provide:

```text
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-publishable-or-anon-key
```

Then:

```powershell
npm run dev
```

Open `http://localhost:3000`.

## Database

Run `supabase/migrations/0001_phase1_foundation.sql` in the Supabase SQL Editor once.
Do not manually create these tables with a different schema; later phases depend on the migration names and relationships.

## Acceptance checklist

- [ ] `npm install` completes without errors.
- [ ] `npm run dev` starts successfully.
- [ ] `/` loads without a build error.
- [ ] Supabase environment variables are present locally.
- [ ] Phase 1 migration executes successfully.
- [ ] RLS remains enabled on foundation tables.
- [ ] `.env.local`, `.next` and `node_modules` remain untracked.

## Next phase

Phase 2 adds mobile-number + password signup/login and the first-user/shop onboarding flow. It must build on these foundation tables rather than replacing them.
