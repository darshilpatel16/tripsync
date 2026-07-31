import { apiRequest } from "../lib/api";
import type { Expense, ExpenseInput, ExpenseSummary } from "./expense-types";
export const listExpenses = async (tripId: string) => (await apiRequest<{data:{expenses:Expense[]}}>(`/trips/${tripId}/expenses`)).data.expenses;
export const getExpenseSummary = async (tripId: string) => (await apiRequest<{data:{summary:ExpenseSummary}}>(`/trips/${tripId}/expenses/summary`)).data.summary;
export const createExpense = async (tripId: string, input: ExpenseInput) => (await apiRequest<{data:{expense:Expense}}>(`/trips/${tripId}/expenses`, { method: "POST", body: JSON.stringify(input) })).data.expense;
export const updateExpense = async (tripId: string, expenseId: string, input: ExpenseInput) => (await apiRequest<{data:{expense:Expense}}>(`/trips/${tripId}/expenses/${expenseId}`, { method: "PATCH", body: JSON.stringify(input) })).data.expense;
export const deleteExpense = (tripId: string, expenseId: string) => apiRequest<void>(`/trips/${tripId}/expenses/${expenseId}`, { method: "DELETE" });
