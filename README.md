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
- `SUPABASE_WAITLIST_TABLE`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `WAITLIST_NOTIFY_TO_EMAIL`

## Supabase table

Run:

- `supabase/waitlist.sql`

## Launch-site clone

A snapshot of the old marketing site has been copied to:

- `/Users/nickholroyd/Desktop/Design Stuff/Teleport/Jetstream-launch-site`
