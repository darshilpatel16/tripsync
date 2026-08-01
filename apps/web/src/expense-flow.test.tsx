import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ExpenseSection } from "./expenses/ExpenseSection";
import * as expenseApi from "./expenses/expense-api";

vi.mock("./expenses/expense-api");
const owner = { id: "11111111-1111-4111-8111-111111111111", displayName: "Darshil", email: "d@test.com" };
const member = { id: "22222222-2222-4222-8222-222222222222", displayName: "Aisha", email: "a@test.com" };
const trip = { id: "33333333-3333-4333-8333-333333333333", name: "Rome", destination: "Rome", startDate: "2026-09-10T00:00:00Z", endDate: "2026-09-17T00:00:00Z", currency: "EUR", role: "OWNER" as const, memberCount: 2, createdAt: "", updatedAt: "", members: [{ role: "OWNER" as const, joinedAt: "", user: owner }, { role: "MEMBER" as const, joinedAt: "", user: member }] };
const summary = { currency: "EUR", totalMinor: 0, balances: [{ user: owner, amountMinor: 0 }, { user: member, amountMinor: 0 }], settlements: [] };

beforeEach(() => { vi.clearAllMocks(); vi.mocked(expenseApi.listExpenses).mockResolvedValue([]); vi.mocked(expenseApi.getExpenseSummary).mockResolvedValue(summary); });
afterEach(cleanup);

describe("expense frontend flow", () => {
  it("converts a major amount and creates an equal split", async () => {
    vi.mocked(expenseApi.createExpense).mockResolvedValue({} as never);
    render(<ExpenseSection currentUserId={owner.id} trip={trip} />);
    await screen.findAllByText(/settled/i);
    fireEvent.click(screen.getByRole("button", { name: /add expense/i }));
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: "Group dinner" } });
    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: "45.90" } });
    fireEvent.click(screen.getByRole("button", { name: /^save expense$/i }));
    await waitFor(() => expect(expenseApi.createExpense).toHaveBeenCalledWith(trip.id, expect.objectContaining({ title: "Group dinner", amountMinor: 4590, paidById: owner.id, participantIds: [owner.id, member.id] })));
  });
});
