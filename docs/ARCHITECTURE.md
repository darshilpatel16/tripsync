# Architecture

## Shape

TripSync begins as a modular monolith: one React client, one Express API, and one PostgreSQL database. This is easier to test and deploy than microservices while preserving clear domain boundaries.

```text
Browser (React)
      |
   JSON/HTTP
      |
Express API
  |-- auth
  |-- trips/memberships
  |-- activities/votes
  `-- expenses/settlements
      |
 Prisma ORM
      |
 PostgreSQL
```

## API conventions

- Base path: `/api`
- JSON request and response bodies
- Resource-oriented routes
- Zod schemas validate untrusted input
- Authentication establishes the current user
- Domain services contain business rules
- Prisma repositories persist data
- One central error handler produces a consistent error shape

## Security decisions

- Passwords will be hashed with Argon2.
- Authentication will use short-lived access and rotating refresh tokens in secure, HTTP-only cookies.
- Trip membership is the authorisation boundary.
- Login and invitation endpoints will be rate limited.
- CORS will allow only the configured web origin.
- Production cookies require HTTPS.

## Data decisions

- UUID primary keys prevent guessable sequential identifiers.
- Monetary values use integer minor units plus an ISO currency code.
- Expense shares are stored explicitly for an auditable split.
- Unique constraints prevent duplicate membership and duplicate votes.
- Cascades remove child records when their parent trip is deleted.

## Deferred decisions

WebSockets, background jobs, object storage, maps, and email are intentionally deferred until after the MVP.

