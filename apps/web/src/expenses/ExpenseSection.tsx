import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ApiError } from "../lib/api";
import { formatMoney, majorToMinor, minorToMajor } from "../lib/currency";
import type { TripDetail } from "../trips/trip-types";
import { createExpense, deleteExpense, getExpenseSummary, listExpenses, updateExpense } from "./expense-api";
import type { Expense, ExpenseSummary } from "./expense-types";

type Props = { trip: TripDetail; currentUserId: string };
type SplitMode = "equal" | "custom";

export function ExpenseSection({ trip, currentUserId }: Props) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [paidById, setPaidById] = useState(currentUserId);
  const [participants, setParticipants] = useState<string[]>(trip.members.map((member) => member.user.id));
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [splitMode, setSplitMode] = useState<SplitMode>("equal");
  const [incurredAt, setIncurredAt] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    const [expenseList, expenseSummary] = await Promise.all([listExpenses(trip.id), getExpenseSummary(trip.id)]);
    setExpenses(expenseList);
    setSummary(expenseSummary);
  }, [trip.id]);

  useEffect(() => { void load().catch(() => setError("TripSync could not load expenses.")); }, [load]);

  const reset = () => { setTitle(""); setAmount(""); setNotes(""); setEditing(null); setSplitMode("equal"); setParticipants(trip.members.map((member) => member.user.id)); setCustomAmounts({}); };
  const toggleParticipant = (id: string) => setParticipants((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(""); setWorking(true);
    try {
      const amountMinor = majorToMinor(amount, trip.currency);
      const base = { title, amountMinor, paidById, incurredAt: new Date(`${incurredAt}T12:00:00`).toISOString(), notes: notes.trim() || null };
      const input = splitMode === "equal"
        ? { ...base, participantIds: participants }
        : { ...base, shares: participants.map((userId) => ({ userId, amountMinor: majorToMinor(customAmounts[userId] ?? "0", trip.currency) })) };
      if (editing) await updateExpense(trip.id, editing, input); else await createExpense(trip.id, input);
      reset(); await load();
    } catch (caught) { setError(caught instanceof ApiError ? caught.message : caught instanceof Error ? caught.message : "Could not save expense."); }
    finally { setWorking(false); }
  };

  const startEdit = (expense: Expense) => {
    setEditing(expense.id); setTitle(expense.title); setAmount(String(minorToMajor(expense.amountMinor, expense.currency))); setPaidById(expense.paidBy.id); setIncurredAt(expense.incurredAt.slice(0, 10)); setNotes(expense.notes ?? ""); setParticipants(expense.shares.map((share) => share.user.id)); setSplitMode("custom"); setCustomAmounts(Object.fromEntries(expense.shares.map((share) => [share.user.id, String(minorToMajor(share.amountMinor, expense.currency))])));
  };

  const remove = async (expense: Expense) => {
    if (!window.confirm(`Delete “${expense.title}”?`)) return;
    try { await deleteExpense(trip.id, expense.id); await load(); } catch { setError("TripSync could not delete this expense."); }
  };

  return <section className="expense-section">
    <div className="itinerary-heading"><div><p className="eyebrow">Shared expenses</p><h2>Spend together, settle simply.</h2><p>Record who paid and split every cost fairly.</p></div>{summary ? <strong className="expense-total">{formatMoney(summary.totalMinor, summary.currency)} total</strong> : null}</div>
    {summary ? <div className="balance-grid">{summary.balances.map((balance) => <div className="balance-card" key={balance.user.id}><span>{balance.user.displayName}</span><strong>{balance.amountMinor === 0 ? "Settled" : balance.amountMinor > 0 ? `gets ${formatMoney(balance.amountMinor, summary.currency)}` : `owes ${formatMoney(-balance.amountMinor, summary.currency)}`}</strong></div>)}</div> : null}
    {summary?.settlements.length ? <div className="settlement-card"><h3>Suggested settlements</h3>{summary.settlements.map((item, index) => <p key={`${item.from.id}-${item.to.id}-${index}`}><strong>{item.from.displayName}</strong> pays <strong>{item.to.displayName}</strong> {formatMoney(item.amountMinor, summary.currency)}</p>)}</div> : null}
    <form className="expense-form" onSubmit={submit}>
      <h3>{editing ? "Edit expense" : "Add expense"}</h3>
      <label className="form-field"><span>Description</span><input required minLength={2} value={title} onChange={(e) => setTitle(e.target.value)} /></label>
      <label className="form-field"><span>Amount ({trip.currency})</span><input required inputMode="decimal" placeholder="45.90" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
      <label className="form-field"><span>Paid by</span><select value={paidById} onChange={(e) => setPaidById(e.target.value)}>{trip.members.map((member) => <option key={member.user.id} value={member.user.id}>{member.user.displayName}</option>)}</select></label>
      <label className="form-field"><span>Date</span><input required type="date" value={incurredAt} onChange={(e) => setIncurredAt(e.target.value)} /></label>
      <fieldset className="split-field"><legend>Split between</legend><div className="split-mode"><button className={splitMode === "equal" ? "active" : "secondary-button"} type="button" onClick={() => setSplitMode("equal")}>Equally</button><button className={splitMode === "custom" ? "active" : "secondary-button"} type="button" onClick={() => setSplitMode("custom")}>Custom</button></div>{trip.members.map((member) => <label className="participant-row" key={member.user.id}><input type="checkbox" checked={participants.includes(member.user.id)} onChange={() => toggleParticipant(member.user.id)} /><span>{member.user.displayName}</span>{splitMode === "custom" && participants.includes(member.user.id) ? <input aria-label={`${member.user.displayName} share`} inputMode="decimal" placeholder="0.00" value={customAmounts[member.user.id] ?? ""} onChange={(e) => setCustomAmounts((current) => ({ ...current, [member.user.id]: e.target.value }))} /> : null}</label>)}</fieldset>
      <label className="form-field expense-notes"><span>Notes</span><textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
      {error ? <p className="form-message form-message-error" role="alert">{error}</p> : null}<div className="activity-form-actions"><button disabled={working || participants.length === 0}>{working ? "Saving…" : editing ? "Save expense" : "Add expense"}</button>{editing ? <button className="secondary-button" type="button" onClick={reset}>Cancel editing</button> : null}</div>
    </form>
    <div className="expense-list">{expenses.map((expense) => { const canEdit = trip.role === "OWNER" || expense.paidBy.id === currentUserId; return <article className="expense-row" key={expense.id}><div><strong>{expense.title}</strong><span>Paid by {expense.paidBy.displayName} · {new Date(expense.incurredAt).toLocaleDateString()}</span></div><strong>{formatMoney(expense.amountMinor, expense.currency)}</strong><span>{expense.shares.length} people</span>{canEdit ? <div><button className="text-button" onClick={() => startEdit(expense)}>Edit</button><button className="text-button danger-text" onClick={() => void remove(expense)}>Delete</button></div> : null}</article>; })}</div>
  </section>;
}
