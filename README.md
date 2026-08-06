# TripSync

TripSync is a shared workspace for planning group travel. It keeps the trip
details, itinerary, travellers, budget, and day-to-day expenses in one place so
the group does not have to piece the plan together from separate chats and
spreadsheets.

The application is split into an Express API and a React web client. Both live
in this repository and are managed as npm workspaces.

## What you can do

- Create a trip with dates, destination, currency, and an optional budget
- Invite travellers and manage the member list
- Propose itinerary activities and vote on the plan
- Confirm, edit, or remove activities according to member permissions
- Record shared expenses with equal or custom splits
- See individual balances and suggested repayments
- Manage account details and a profile photo

The web interface uses a destination-aware travel theme. Known destinations
such as New York, London, Japan, Paris, Italy, and coastal locations receive
their own visual treatment; other destinations use the standard TripSync theme.

## Tech stack

| Area | Tools |
| --- | --- |
| Web | React, TypeScript, Vite, React Router |
| API | Node.js, Express, TypeScript, Zod |
| Data | PostgreSQL, Prisma |
| Tests | Vitest, Supertest, React Testing Library |

## Repository structure

```text
apps/
  api/       Express routes, services, Prisma schema, and API tests
  web/       React pages, shared components, styles, and browser-flow tests
docs/        Product notes and architecture decisions
```

## Running TripSync locally

You will need Node.js, npm, PostgreSQL, and Git.

1. Clone the repository and install dependencies.

   ```bash
   git clone https://github.com/darshilpatel16/tripsync.git
   cd tripsync
   npm install
   ```

2. Create the API environment file.

   PowerShell:

   ```powershell
   Copy-Item apps/api/.env.example apps/api/.env
   ```

   macOS or Linux:

   ```bash
   cp apps/api/.env.example apps/api/.env
   ```

3. Create a PostgreSQL database named `tripsync`, then update `DATABASE_URL` in
   `apps/api/.env` with the correct username and password.

4. Generate the Prisma client and apply the migrations.

   ```bash
   npm run db:generate
   npm run db:migrate
   ```

5. Start the API and web client.

   ```bash
   npm run dev
   ```

The web app runs at `http://localhost:5173`. The API health endpoint is
`http://localhost:5000/api/health`.

## Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the API and web development servers |
| `npm test` | Run all API and web tests |
| `npm run lint` | Check the source with ESLint |
| `npm run build` | Build both workspaces for production |
| `npm run db:generate` | Generate the Prisma client |
| `npm run db:migrate` | Apply database migrations |
| `npm run db:studio` | Open Prisma Studio |

## Before opening a pull request

Run the same checks used for the current branch:

```bash
npm test
npm run lint
npm run build
```

At the time of writing, the suite contains 88 API tests and 16 web tests.

## Planned work

Weather, maps, local events, and messaging are intentionally outside the current
scope. They can be added later without changing the core trip-planning workflow.
