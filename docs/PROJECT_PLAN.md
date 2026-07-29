# TripSync project plan

## Problem

Group travel plans are fragmented across messages, notes, polls, maps, and expense tools. Decisions are difficult to find, plans become inconsistent, and repayments are unclear.

## Product goal

Give a small group one trustworthy place to decide what to do, organise when to do it, and track shared costs.

## Target users

- **Organiser:** creates a trip, invites members, and manages trip details.
- **Member:** collaborates on activities, votes, and records or participates in expenses.

## MVP acceptance journey

Alice registers, creates a trip, adds Bob, proposes an activity, Bob votes for it, Alice records a shared expense, and both can see the resulting balances. Neither user can access a trip they do not belong to.

## Scope

### Must have

- Email/password authentication
- Trip CRUD with date validation
- Owner/member roles
- Member invitations or direct email addition
- Activity CRUD and one vote per member
- Expense creation with configurable participants
- Deterministic balance and settlement calculation
- Responsive and keyboard-usable interface
- API validation, central error handling, tests, and deployment

### Not in MVP

- Live chat or real-time presence
- Maps, routes, weather, or currency conversion
- File uploads or travel documents
- Payment collection
- AI itinerary generation
- Native mobile applications

## Quality bar

- No secrets committed
- Authorisation checked on the server for every trip resource
- Money stored as integer minor units, never floating point
- UTC timestamps; trip dates stored as date values
- Validation at API boundaries
- Meaningful empty, loading, and error states
- Unit tests for settlement logic; integration tests for critical APIs
- Accessible labels, focus states, and colour contrast

## Eight-week delivery outline

1. Foundation, design, and health endpoint
2. Authentication
3. Trips and membership permissions
4. Itinerary and voting
5. Expenses and settlement algorithm
6. Integration and end-to-end tests
7. UI polish, accessibility, observability, and security review
8. Deployment, documentation, demo data, and portfolio case study

