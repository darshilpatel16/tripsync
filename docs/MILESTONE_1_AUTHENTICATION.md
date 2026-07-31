# Milestone 1: Authentication — beginner guide

## What we finished

Milestone 1 gives TripSync a secure front door. A visitor can create an account,
sign in, stay signed in after refreshing the browser, visit a private dashboard,
sign out, and reset a forgotten password.

Think of TripSync as a house:

- registration creates a person in the household list;
- login checks their name and secret password;
- the session cookie is a temporary, unforgeable door key;
- authentication middleware is the security guard;
- logout destroys the key;
- password reset proves the user has a special one-time recovery ticket.

## The complete journey

```text
React form
   -> API route
   -> Zod validation
   -> authentication service
   -> Prisma
   -> PostgreSQL
   -> safe response + HTTP-only session cookie
```

Example: when a user signs in, `LoginPage.tsx` sends an email and password to
`POST /api/auth/login`. `auth.routes.ts` validates the message.
`auth.service.ts` checks the Argon2 password hash. `session.service.ts` creates a
random session token. The browser receives the token inside a protected cookie.

## Backend files

### `apps/api/prisma/schema.prisma`

This is the database blueprint. Prisma reads it to understand what tables and
relationships TripSync needs.

Authentication uses three models:

- `User`: account name, normalised unique email, and password hash;
- `Session`: hashed temporary login keys with an expiry time;
- `PasswordResetToken`: hashed one-time recovery keys with an expiry and used time.

We never store the original password, session token, or reset token. If someone
read the database, the hashes would not directly give them those secrets.

### `apps/api/prisma/migrations/...`

A migration is a saved set of database changes. It is like a construction plan
that says “create this table and these indexes.” Migrations let another developer
build the same database by running one command. They must be committed to Git.

### `apps/api/src/config/env.ts`

This checks application settings such as the API port, allowed website address,
and environment. Instead of trusting random text, Zod confirms the settings have
the expected shape.

Example: in development the API defaults to port `5000` and only accepts browser
requests from `http://localhost:5173`.

### `apps/api/src/lib/prisma.ts`

This creates one shared Prisma client. The client is the database telephone:
services use it to ask PostgreSQL to find, create, update, or delete information.
Sharing one client avoids opening a new database connection in every file.

### `apps/api/src/modules/auth/auth.schemas.ts`

These Zod schemas are the reception desk. They inspect all information sent by a
browser before the rest of the application uses it.

Example: registration requires a valid email, a 2–50 character display name, and
a 12–128 character password. Unknown fields such as `isAdmin: true` are rejected.

### `apps/api/src/modules/auth/auth.service.ts`

This contains the main authentication rules:

- hash a password and create a safe user;
- verify a login without revealing whether the email exists;
- create a hashed, 30-minute password-reset token;
- replace a password, consume the token, and delete old sessions.

Routes deal with HTTP. The service deals with business rules. Keeping them apart
makes the rules easier to test and reuse.

### `apps/api/src/modules/auth/session.service.ts`

This manages login sessions. It creates a cryptographically random token, stores
only its SHA-256 hash, finds the matching user, rejects expired sessions, and
deletes a session during logout.

Simple example: the browser holds `secret-key-123`, while the database holds only
`hash(secret-key-123)`. The API hashes the presented key and compares the hashes.

### `apps/api/src/modules/auth/auth.middleware.ts`

Middleware runs before a protected route. It reads the session cookie and asks
the session service who owns it. A valid user is placed in `response.locals.user`.
An absent or invalid cookie receives `401 Authentication Required`.

This is reusable: future trip routes can place `requireAuthentication` before
their controller instead of rewriting the same security check.

### `apps/api/src/modules/auth/auth.routes.ts`

This is the API traffic controller. It defines:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

It validates requests, calls services, chooses HTTP status codes, sets or clears
the HTTP-only cookie, and returns a consistent JSON shape.

### `apps/api/src/middleware/rate-limit.ts`

This limits repeated login and reset attempts from one network address. The first
ten attempts in fifteen minutes are allowed; later attempts receive status `429`.
It makes automated password guessing more difficult. This in-memory limiter is
suitable for the current single API process; a multi-server deployment should
use a shared Redis-backed limiter.

### `apps/api/src/app.ts`

This assembles the Express application in the correct order: security headers,
CORS, JSON parsing, cookie parsing, routes, not-found handling, and final error
handling. It does not open a port, so tests can create the app without starting a
real server.

### `apps/api/src/server.ts`

This is the small start button. It loads environment settings, creates the Express
app, and listens on port 5000. Keeping it separate from `app.ts` improves testing.

### Backend test files

- `auth.schemas.test.ts`: proves invalid or dangerous request data is rejected;
- `auth.service.test.ts`: proves hashing, duplicate protection, login, and reset;
- `session.service.test.ts`: proves tokens are hashed, expire, and can be deleted;
- `auth.routes.test.ts`: tests the real HTTP endpoints and cookie behaviour;
- `rate-limit.test.ts`: proves too many requests receive status 429;
- `health.test.ts`: proves the API health endpoint still works.

Tests are automatic questions we ask our code. If a future change breaks login,
the test suite should warn us before a user finds the problem.

## Frontend files

### `apps/web/src/lib/api.ts`

This is the browser’s single helper for talking to the API. It adds the API base
address, sends cookies with `credentials: "include"`, handles empty responses,
and turns API error JSON into an `ApiError` object the pages can display.

### `apps/web/src/auth/auth-types.ts`

This describes the shape of a safe signed-in user and the three authentication
states: `loading`, `authenticated`, or `guest`. TypeScript uses this like a form
template to catch wrong data during development.

### `apps/web/src/auth/auth-context.ts`

This creates React’s shared authentication box. Pages anywhere in the component
tree can read the same current user instead of passing the user through every
component manually.

### `apps/web/src/auth/AuthProvider.tsx`

This fills the shared authentication box. On page load it calls `/auth/me` to
restore an existing session. It also supplies `login()` and `logout()` functions
and updates the user state immediately after those actions.

### `apps/web/src/auth/useAuth.ts`

This is a convenient hook for opening the authentication box. A component calls
`useAuth()` and receives the current user, status, login, and logout functions.
It also gives a clear error if someone uses it outside `AuthProvider`.

### `apps/web/src/auth/ProtectedRoute.tsx`

This is the frontend security gate. While `/auth/me` is loading, it shows a
checking message. Guests are redirected to login. Signed-in users may continue
to the private page. The API still performs the real security check; hiding a
page in React alone is never sufficient protection.

### `apps/web/src/pages/RegisterPage.tsx`

This renders the create-account form, checks matching passwords, sends valid data
to the registration endpoint, displays field errors, and moves the user to login.

### `apps/web/src/pages/LoginPage.tsx`

This sends the email and password through the shared `login()` function. A good
login redirects to the dashboard. A bad login shows the safe generic API error.

### `apps/web/src/pages/DashboardPage.tsx`

This is the first protected screen and proves authentication works end to end.
It greets the signed-in user and provides logout. Trip cards are intentionally
left for Milestone 2.

### `apps/web/src/pages/ForgotPasswordPage.tsx`

This requests a password reset. The response looks identical for known and
unknown emails. During local development only, it shows the generated link because
we have not connected a real email provider. Production never returns the token.

### `apps/web/src/pages/ResetPasswordPage.tsx`

This reads the one-time token from the URL, checks that both password fields
match, submits the new password, and returns the user to login after success.

### `apps/web/src/App.tsx`

This is the route map. It connects URL paths to pages and nests `/dashboard`
inside `ProtectedRoute`.

### `apps/web/src/main.tsx`

This is the browser entry point. It attaches React to the HTML page and wraps the
application in `BrowserRouter` and `AuthProvider`, making navigation and auth
state available throughout TripSync.

### `apps/web/src/styles.css`

This supplies the shared visual rules: colours, spacing, forms, messages,
responsive layouts, the private dashboard, keyboard focus, and disabled states.

### Frontend test files

- `App.test.tsx`: proves important public pages render;
- `auth-flow.test.tsx`: proves login navigation and guest redirection work;
- `test/setup.ts`: loads extra DOM assertions such as `toBeInTheDocument()`.

## Security choices in plain language

1. Passwords use Argon2id hashes, never plain text.
2. Session and reset tokens are random and only their hashes are stored.
3. The cookie is HTTP-only, so normal browser JavaScript cannot read it.
4. Production cookies require HTTPS and use SameSite=Lax.
5. CORS accepts the configured TripSync website only.
6. Helmet adds common protective HTTP headers.
7. Login and reset routes are rate limited.
8. Reset replies do not reveal registered emails.
9. Resetting a password signs out all existing sessions.
10. Every private API route must use server-side authentication.

## What is deliberately left for later

- Email delivery needs a provider before public deployment. Local development
  exposes a reset link only when `NODE_ENV=development`.
- A multi-server production deployment should replace the in-memory rate limiter
  with a shared store such as Redis.
- Email verification and optional multi-factor authentication are post-MVP work.

## Milestone 1 definition of done

- registration works and rejects duplicate/invalid data;
- passwords are safely hashed;
- login creates a secure database session and cookie;
- refresh restores the signed-in user;
- dashboard rejects guests;
- logout destroys the database session and clears the cookie;
- forgotten passwords use expiring, one-time, hashed reset tokens;
- sensitive endpoints are rate limited;
- builds, linting, and automated tests pass;
- the full journey works in a real browser.

## Final manual browser check

The automated suite verifies the code and database behaviour. Before starting
Milestone 2, perform this final visual check from the repository root:

1. Run `npm run dev` in the VS Code terminal.
2. Open `http://localhost:5173/register`.
3. Create a test account with a new email and a password of 12+ characters.
4. Sign in and confirm that the private dashboard greets you by name.
5. Refresh the dashboard and confirm that you remain signed in.
6. Sign out and confirm that `/dashboard` redirects you to `/login`.
7. Select **Forgot your password?**, request a reset, and use the yellow local
   development link.
8. Choose a new password and confirm that the old password no longer works but
   the new password does.

This click-through is intentionally manual because it verifies appearance,
focus, browser cookies, navigation, and the two running applications together.
