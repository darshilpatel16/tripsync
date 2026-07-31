export type Person = { id: string; displayName: string };
export type Expense = { id: string; tripId: string; title: string; amountMinor: number; currency: string; incurredAt: string; notes: string | null; paidBy: Person; shares: Array<{ amountMinor: number; user: Person }> };
export type ExpenseInput = { title: string; amountMinor: number; paidById: string; participantIds?: string[]; shares?: Array<{ userId: string; amountMinor: number }>; incurredAt: string; notes: string | null };
export type ExpenseSummary = { currency: string; totalMinor: number; balances: Array<{ user: Person; amountMinor: number }>; settlements: Array<{ from: Person; to: Person; amountMinor: number }> };
