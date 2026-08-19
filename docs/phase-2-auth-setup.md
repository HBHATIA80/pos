# Phase 2 — Mobile number + password authentication

## Scope

Phase 2 adds:

- public shop-admin signup
- mobile-number + password login
- password visibility controls
- protected dashboard
- logout
- automatic creation of a business and admin profile
- responsive auth screens for phone, tablet and desktop

There is deliberately no email OTP flow and no GST/tax logic.

## Supabase settings

In Supabase Dashboard, open Authentication settings and enable the **Phone** provider.

For this MVP, keep phone confirmation disabled if you want signup/login to work with only a mobile number and password. If phone confirmation is enabled, Supabase will require a verification step before the user can receive a session.

## Phone format

The UI accepts international E.164-style numbers, for example:

`+919876543210`

Spaces, parentheses and hyphens are removed before the request is sent to Supabase.

## Database migration

Run this migration once in Supabase SQL Editor after the Phase 1 migration:

`supabase/migrations/0002_phase2_phone_password_auth.sql`

The migration creates a `public.handle_new_user()` trigger on `auth.users`.

The trigger:

1. reads `full_name`, `business_name` and `business_phone` from signup metadata
2. creates a new `businesses` row
3. creates a `profiles` row
4. assigns the first public signup the `admin` role

Staff and normal user creation will be implemented in Phase 3 and will not use public signup.

## Verification

After running the migration, create a test shop at `/signup`.

Then verify in Supabase Table Editor:

- one row exists in `businesses`
- one row exists in `profiles`
- the profile role is `admin`
- the profile phone matches the Auth phone

Then log out and sign in again at `/login` using the same mobile number and password.
