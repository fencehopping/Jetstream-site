# Jetstream Marketing Site

Production marketing site for [Jetstream Flights & Travel](https://apps.apple.com/us/app/jetstream-flights-travel/id6760587975), the iPhone flight-price tracking and travel-planning app.

## Contents

- `index.html`: live App Store landing page
- `influencers.html`: creator partnership brief
- `airport/index.html`: tracked airport-campaign redirect to the App Store
- `privacy/` and `terms/`: policy pages
- `styles.css`: shared responsive styling
- `assets/`: optimized App Store creative, app branding, and destination imagery
- `api/signup.js` and `supabase/`: retained legacy waitlist infrastructure

## Local preview

Serve the directory with any static web server, for example:

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

## Deployment

The repository is configured for Vercel and uses the custom domain in `CNAME`.

## Airport campaign

The `/airport` route records the `airport_tv_qr_scan` GA4 event and redirects to the App Store campaign URL using campaign token `AirportTV_BOS_May2026`.

Keeping the QR code pointed at `/airport` allows the destination and attribution settings to be updated without replacing the printed code.
