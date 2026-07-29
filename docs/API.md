# Initial API contract

## Foundation

- `GET /api/health`

## Authentication

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`

## Trips and members

- `GET /api/trips`
- `POST /api/trips`
- `GET /api/trips/:tripId`
- `PATCH /api/trips/:tripId`
- `DELETE /api/trips/:tripId`
- `GET /api/trips/:tripId/members`
- `POST /api/trips/:tripId/invitations`

## Activities and voting

- `GET /api/trips/:tripId/activities`
- `POST /api/trips/:tripId/activities`
- `PATCH /api/trips/:tripId/activities/:activityId`
- `DELETE /api/trips/:tripId/activities/:activityId`
- `PUT /api/trips/:tripId/activities/:activityId/vote`
- `DELETE /api/trips/:tripId/activities/:activityId/vote`

## Expenses and settlements

- `GET /api/trips/:tripId/expenses`
- `POST /api/trips/:tripId/expenses`
- `PATCH /api/trips/:tripId/expenses/:expenseId`
- `DELETE /api/trips/:tripId/expenses/:expenseId`
- `GET /api/trips/:tripId/settlements`

## Error shape

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": []
  }
}
```

