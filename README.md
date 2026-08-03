# TripSync

TripSync is a collaborative travel-planning platform for groups to build an itinerary, vote on activities, record shared expenses, and understand who owes whom.

## MVP

A signed-in user can:

1. Create a trip with a destination and travel dates.
2. Invite or add members.
3. Propose itinerary activities.
4. Vote on proposed activities.
5. Record expenses and their participants.
6. View simplified settlement balances.

The core MVP is now complete. Milestone 5 extends it with useful travel integrations while chat, AI, document uploads, and payments remain outside the current scope.

## Stack

- React, TypeScript, Vite
- Node.js, Express, TypeScript
- PostgreSQL, Prisma
- Zod validation
- Vitest, Supertest, React Testing Library

## Repository layout

```text
apps/
  api/       Express API and Prisma schema
  web/       React application
docs/        Product and architecture decisions
```

## Local setup

1. Copy `apps/api/.env.example` to `apps/api/.env`.
2. Replace `YOUR_PASSWORD` in `DATABASE_URL` with your local PostgreSQL password.
3. Start PostgreSQL and create a database named `tripsync`.
4. Run `npm install`.
5. Run `npm run db:generate`.
6. Run `npm run db:migrate`.
7. Run `npm run dev`.

### Optional live-event setup

TripSync uses Ticketmaster's Discovery API for real concerts, sport, theatre, and family events. Create a developer key and add it only to `apps/api/.env`:

```env
TICKETMASTER_API_KEY=your_private_key
```

Never add the real key to Git. Without a key, the rest of TripSync still works and the Events section displays a safe setup state.

### Optional route-planning setup

Driving, walking, and cycling routes use openrouteservice. Create a developer key and add it only to `apps/api/.env`:

```env
OPENROUTESERVICE_API_KEY=your_private_key
```

Without this key, TripSync continues to work and the Transport section displays a safe setup state. Public-transport timetables are outside this version because availability differs by region.

Web: `http://localhost:5173`  
API health check: `http://localhost:5000/api/health`

## Delivery milestones

- Milestone 0: foundation and health-check vertical slice
- Milestone 1: authentication (complete; see `docs/MILESTONE_1_AUTHENTICATION.md`)
- Milestone 2: trips, memberships, and email invitations (complete)
- Milestone 3: itinerary and voting (complete)
- Milestone 4: expenses, settlements, currencies, avatars, and trip budgets (complete)
- Milestone 5A: destination weather (complete)
- Milestone 5B: interactive maps and nearby places (complete)
- Milestone 5C: real local events (complete)
- Milestone 5D: driving, walking, and cycling route planning (complete)
- Milestone 6: accessibility, production deployment, and portfolio case study
