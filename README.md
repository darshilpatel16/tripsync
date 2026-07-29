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

The MVP deliberately excludes chat, maps, weather, AI, document uploads, and payments. Those features are candidates for later releases after the core workflow is reliable.

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

1. Copy `.env.example` to `.env`.
2. Start PostgreSQL and create a `tripsync` database.
3. Run `npm install`.
4. Run `npm run db:generate`.
5. Run `npm run db:migrate`.
6. Run `npm run dev`.

Web: `http://localhost:5173`  
API health check: `http://localhost:5000/api/health`

## Delivery milestones

- Milestone 0: foundation and health-check vertical slice
- Milestone 1: authentication
- Milestone 2: trips and memberships
- Milestone 3: itinerary and voting
- Milestone 4: expenses and settlements
- Milestone 5: accessibility, testing, deployment, and portfolio case study

