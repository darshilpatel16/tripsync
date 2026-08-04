# TripSync

TripSync is a full-stack collaborative travel-planning application. It helps groups organise trips, build shared itineraries, vote on activities, manage invitations, record expenses, track a budget, and understand who owes whom.

## Project status

**Stable through Milestone 4.**

- 88 API tests
- 16 web application tests
- ESLint checks with zero warnings
- Successful TypeScript and Vite production builds
- Responsive desktop and mobile layouts

## Core features

### Authentication and accounts

- Register, sign in, and sign out
- Secure password hashing and persistent sessions
- Protected application routes
- Password-reset flow
- Profile and profile-photo management

### Trips and collaboration

- Create, view, edit, and delete trips
- Set destination, travel dates, and currency
- Invite travellers by email
- Accept or decline invitations
- View members and invitation history
- Owner and member permissions

### Shared itinerary

- Propose activities with location, notes, and times
- Organise activities by trip day
- Vote on proposed activities
- View voting participation
- Confirm, return, or cancel activities
- Edit and delete activities according to permissions

### Expenses and budgets

- Record shared expenses
- Split costs equally or use custom amounts
- Edit and delete expenses
- Track spending against the trip budget
- View individual balances
- Generate settlement suggestions

### User experience

- Responsive desktop and mobile design
- Loading, validation, success, and error feedback
- Empty states
- Protected destructive actions
- Consistent dashboard and trip navigation

## Technology stack

### Frontend

- React
- TypeScript
- Vite
- React Router
- React Testing Library

### Backend

- Node.js
- Express
- TypeScript
- Zod
- Vitest
- Supertest

### Database

- PostgreSQL
- Prisma ORM

## Architecture

```text
React and Vite web application
             |
             | HTTP/JSON REST API
             v
Node.js and Express API
             |
             | Prisma ORM
             v
         PostgreSQL
```

The frontend and backend are managed in one npm workspace. The API handles authentication, permissions, validation, and database access. The React application provides the collaborative user interface.

## Repository layout

```text
apps/
  api/       Express API, Prisma schema, routes, services, and tests
  web/       React application, components, and flow tests
docs/        Product and architecture decisions
```

## Local setup

### Prerequisites

- Node.js and npm
- PostgreSQL
- Git

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/darshilpatel16/tripsync.git
   cd tripsync
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy the API environment template.

   Windows PowerShell:

   ```powershell
   Copy-Item apps/api/.env.example apps/api/.env
   ```

   macOS or Linux:

   ```bash
   cp apps/api/.env.example apps/api/.env
   ```

4. Create a PostgreSQL database named `tripsync`.

5. Update `DATABASE_URL` in `apps/api/.env` with your PostgreSQL credentials.

6. Generate Prisma and run the migrations:

   ```bash
   npm run db:generate
   npm run db:migrate
   ```

7. Start the application:

   ```bash
   npm run dev
   ```

8. Open:

   - Web application: `http://localhost:5173`
   - API health check: `http://localhost:5000/api/health`

## Available scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the API and web development servers |
| `npm test` | Run all API and web tests |
| `npm run lint` | Run ESLint |
| `npm run build` | Create production builds |
| `npm run db:generate` | Generate the Prisma client |
| `npm run db:migrate` | Run database migrations |
| `npm run db:studio` | Open Prisma Studio |

## Delivery milestones

- **Milestone 0:** Workspace foundation and API health check
- **Milestone 1:** Authentication, password reset, and secure sessions
- **Milestone 2:** Trips, memberships, and invitations
- **Milestone 3:** Collaborative itinerary and voting
- **Milestone 4:** Expenses, custom splits, balances, settlements, and budgets

## Future improvements

Possible future releases include:

- Destination weather forecasts
- Maps and place discovery
- Local event discovery
- Transport planning
- Email delivery for invitations and password resets
- Production hosting and monitoring

These features will be developed independently so the stable core workflow remains protected.

## Quality checks

Before merging changes, run:

```bash
npm test
npm run lint
npm run build
```

The stable Milestone 4 release passes all three checks.