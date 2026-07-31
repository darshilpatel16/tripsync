import { Router } from "express";

import { requireAuthentication } from "../auth/auth.middleware.js";
import { TripNotFoundError } from "../trips/trip.service.js";
import {
  createExpenseBodySchema,
  expenseTripParamsSchema,
} from "./expense.schemas.js";
import {
  createExpense,
  ExpenseMemberError,
  listExpenses,
} from "./expense.service.js";

export const expenseRouter = Router({ mergeParams: true });
expenseRouter.use(requireAuthentication);

const sendValidationError = (
  response: Parameters<Parameters<typeof expenseRouter.post>[1]>[1],
  message: string,
  issues: Array<{ path: PropertyKey[]; message: string }>,
) => response.status(400).json({
  error: {
    code: "VALIDATION_ERROR",
    message,
    details: issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    })),
  },
});

const handleExpenseError = (
  error: unknown,
  response: Parameters<Parameters<typeof expenseRouter.post>[1]>[1],
  next: (error?: unknown) => void,
) => {
  if (error instanceof TripNotFoundError) {
    response.status(404).json({
      error: { code: "TRIP_NOT_FOUND", message: "Trip was not found" },
    });
    return;
  }
  if (error instanceof ExpenseMemberError) {
    sendValidationError(response, "The expense members are invalid", [
      { path: ["participantIds"], message: error.message },
    ]);
    return;
  }
  next(error);
};

expenseRouter.get("/", async (request, response, next) => {
  const params = expenseTripParamsSchema.safeParse(request.params);
  if (!params.success) {
    sendValidationError(response, "The trip ID is invalid", params.error.issues);
    return;
  }
  try {
    const expenses = await listExpenses(response.locals.user.id, params.data.tripId);
    response.status(200).json({ data: { expenses } });
  } catch (error) {
    handleExpenseError(error, response, next);
  }
});

expenseRouter.post("/", async (request, response, next) => {
  const params = expenseTripParamsSchema.safeParse(request.params);
  const body = createExpenseBodySchema.safeParse(request.body);
  if (!params.success || !body.success) {
    sendValidationError(response, "The expense information is invalid", [
      ...(params.success ? [] : params.error.issues),
      ...(body.success ? [] : body.error.issues),
    ]);
    return;
  }
  try {
    const expense = await createExpense(
      response.locals.user.id,
      params.data.tripId,
      body.data,
    );
    response.status(201).json({ data: { expense } });
  } catch (error) {
    handleExpenseError(error, response, next);
  }
});
