# Jetstream Pre-Launch Site

Static pre-launch landing page for Jetstream with a serverless waitlist signup endpoint.

## Contents

- `index.html`: pre-launch landing page markup
- `styles.css`: site styling
- `app.js`: client-side waitlist form submission
- `api/signup.js`: serverless waitlist signup endpoint
- `assets/`: local image assets used by the page

## Recommended stack

- Frontend: static site
- Email delivery: Resend
- Waitlist storage: Supabase
- Deployment: Vercel

The site stays mostly static, while `api/signup.js` handles:

1. Validating the email address
2. Checking Supabase for an existing signup
3. Writing new signups into the waitlist table
4. Sending a notification email and a confirmation email through Resend

## Environment variables

Copy `.env.example` to `.env.local` and set:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_PUB_API_KEY`
- `SUPABASE_LEGACY_API_KEY`
- `SUPABASE_WAITLIST_TABLE`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `WAITLIST_NOTIFY_TO_EMAIL`

You can also copy:

- `.env.local.example` -> `.env.local`

Recommended values for this project:

- `SUPABASE_URL=https://aryshrrikwgttkisljgh.supabase.co`
- `WAITLIST_NOTIFY_TO_EMAIL=nick@shedlabs.studio`

You still need to supply your real values for:

- `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_PUB_API_KEY` / `SUPABASE_LEGACY_API_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

## Supabase table

Run:

- `supabase/waitlist.sql`

Notes:

- `SUPABASE_SERVICE_ROLE_KEY` is preferred for server-side writes.
- If you only have `SUPABASE_PUB_API_KEY` or `SUPABASE_LEGACY_API_KEY`, this repo now supports that too.
- When using the public or legacy key, the insert policy in `supabase/waitlist.sql` must be applied.

## Launch-site clone

A snapshot of the old marketing site has been copied to:

- `/Users/nickholroyd/Desktop/Design Stuff/Teleport/Jetstream-launch-site`
