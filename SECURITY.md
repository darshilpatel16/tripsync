# Security policy

## Reporting a vulnerability

Please do not publish suspected vulnerabilities in a public issue. Contact the
repository owner privately and include the affected page or API route, steps to
reproduce the problem, and its likely impact. Avoid including real passwords,
session cookies, database credentials, or personal traveller information.

## Supported version

Security fixes are applied to the version currently deployed from the active
production branch. Older local builds are not maintained separately.

## Deployment checklist

Before a production deployment:

1. Run the test suite, lint check, and production build.
2. Confirm `NODE_ENV=production` and set `WEB_ORIGIN` to the exact public HTTPS
   origin, with no path.
3. Store `DATABASE_URL`, email credentials, and other secrets only in the
   hosting provider's protected environment settings.
4. Apply pending database migrations before serving application traffic.
5. Review GitHub, Vercel, and Neon access, and require two-factor
   authentication for administrator accounts.
6. Rotate a credential immediately if it appears in source code, logs, an
   issue, or a screenshot.

## Application controls

TripSync uses Argon2 password hashing, opaque server-side sessions, role and
membership checks, schema validation, rate limiting, same-origin checks, and
restrictive production response headers. These controls reduce common risks,
but they do not replace dependency updates, access reviews, backups, and log
monitoring.
