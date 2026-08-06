import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { Avatar } from "../components/Avatar";
import { ApiError } from "../lib/api";
import { formatMoney, majorToMinor, minorToMajor } from "../lib/currency";
import type { TripDetail } from "../trips/trip-types";
import { createExpense, deleteExpense, getExpenseSummary, listExpenses, updateExpense } from "./expense-api";
import type { Expense, ExpenseSummary } from "./expense-types";

type Props = { trip: TripDetail; currentUserId: string };
type SplitMode = "equal" | "custom";

// Expenses do not have a persisted category yet. These conservative keyword
// matches keep the chart useful without pretending the result is user-entered.
const categoryFor = (title: string) => {
  const value = title.toLowerCase();
  if (/hotel|stay|hostel|room|airbnb/.test(value)) return "Stay";
  if (/train|taxi|flight|bus|uber|transport|car/.test(value)) return "Transport";
  if (/food|dinner|lunch|breakfast|restaurant|market|coffee/.test(value)) return "Food";
  return "Activities";
};

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
  const [showForm, setShowForm] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [search, setSearch] = useState("");
  const [payerFilter, setPayerFilter] = useState("all");

  const load = useCallback(async () => {
    // Fetch the rows and calculated balances together to keep the dashboard in sync.
    const [expenseList, expenseSummary] = await Promise.all([listExpenses(trip.id), getExpenseSummary(trip.id)]);
    setExpenses(expenseList); setSummary(expenseSummary);
  }, [trip.id]);
  useEffect(() => { void load().catch(() => setError("TripSync could not load expenses.")); }, [load]);

  const reset = () => { setTitle(""); setAmount(""); setNotes(""); setEditing(null); setSplitMode("equal"); setParticipants(trip.members.map((member) => member.user.id)); setCustomAmounts({}); setShowAdvanced(false); setShowForm(false); };
  const toggleParticipant = (id: string) => setParticipants((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(""); setWorking(true);
    try {
      const amountMinor = majorToMinor(amount, trip.currency);
      const base = { title, amountMinor, paidById, incurredAt: new Date(`${incurredAt}T12:00:00`).toISOString(), notes: notes.trim() || null };
      // Equal splits send participant IDs; custom splits send explicit minor-unit shares.
      const input = splitMode === "equal" ? { ...base, participantIds: participants } : { ...base, shares: participants.map((userId) => ({ userId, amountMinor: majorToMinor(customAmounts[userId] ?? "0", trip.currency) })) };
      if (editing) await updateExpense(trip.id, editing, input); else await createExpense(trip.id, input);
      reset(); await load();
    } catch (caught) { setError(caught instanceof ApiError ? caught.message : caught instanceof Error ? caught.message : "Could not save expense."); }
    finally { setWorking(false); }
  };
  const startEdit = (expense: Expense) => { setEditing(expense.id); setTitle(expense.title); setAmount(String(minorToMajor(expense.amountMinor, expense.currency))); setPaidById(expense.paidBy.id); setIncurredAt(expense.incurredAt.slice(0, 10)); setNotes(expense.notes ?? ""); setParticipants(expense.shares.map((share) => share.user.id)); setSplitMode("custom"); setCustomAmounts(Object.fromEntries(expense.shares.map((share) => [share.user.id, String(minorToMajor(share.amountMinor, expense.currency))]))); setShowAdvanced(true); setShowForm(true); };
  const remove = async (expense: Expense) => { if (!window.confirm(`Delete “${expense.title}”?`)) return; try { await deleteExpense(trip.id, expense.id); await load(); } catch { setError("TripSync could not delete this expense."); } };

  // Cap the visual progress bar at 100%; the remaining value still reports overspend.
  const budgetStatus = summary && trip.budgetMinor !== null ? { remainingMinor: trip.budgetMinor - summary.totalMinor, percentageUsed: Math.min(100, Math.round((summary.totalMinor / trip.budgetMinor) * 100)) } : null;
  const visibleExpenses = useMemo(() => expenses.filter((expense) => expense.title.toLowerCase().includes(search.toLowerCase()) && (payerFilter === "all" || expense.paidBy.id === payerFilter)), [expenses, payerFilter, search]);
  // Memoise chart totals because categorisation touches every expense row.
  const categoryTotals = useMemo(() => { const totals = new Map<string, number>(); expenses.forEach((expense) => totals.set(categoryFor(expense.title), (totals.get(categoryFor(expense.title)) ?? 0) + expense.amountMinor)); return [...totals.entries()].sort((a, b) => b[1] - a[1]); }, [expenses]);
  const currentBalance = summary?.balances.find((balance) => balance.user.id === currentUserId)?.amountMinor ?? 0;
  const memberPhoto = (id: string) => trip.members.find((member) => member.user.id === id)?.user.avatarDataUrl;

  return <section className="expense-section expense-dashboard" id="expenses">
    <header className="expense-dashboard-header"><div><h2>Shared expenses</h2><p>{new Date(trip.startDate).toLocaleDateString()} – {new Date(trip.endDate).toLocaleDateString()} &nbsp;•&nbsp; {trip.destination}</p></div><div className="expense-member-stack"><span>Members</span><div>{trip.members.slice(0, 5).map((member) => <Avatar key={member.user.id} name={member.user.displayName} photo={member.user.avatarDataUrl} />)}</div></div><button type="button" onClick={() => setShowForm((value) => !value)}>{showForm ? "Close" : "Add expense  +"}</button></header>
    {summary ? <div className="expense-summary-cards">
      <article><span className="expense-summary-icon">▣</span><div><small>Total spent</small><strong>{formatMoney(summary.totalMinor, summary.currency)}</strong>{budgetStatus && trip.budgetMinor !== null ? <><div className="budget-progress" role="progressbar" aria-label="Budget used" aria-valuemin={0} aria-valuemax={trip.budgetMinor} aria-valuenow={Math.min(summary.totalMinor, trip.budgetMinor)}><span className="budget-progress-fill" style={{ width: `${budgetStatus.percentageUsed}%` }} /></div><small>{budgetStatus.percentageUsed}% of <b>{formatMoney(trip.budgetMinor, trip.currency)}</b> budget</small></> : <small>No budget set</small>}</div></article>
      <article><span className="expense-summary-icon accent">▤</span><div><small>Trip budget</small><strong>{trip.budgetMinor === null ? "Not set" : formatMoney(trip.budgetMinor, trip.currency)}</strong>{trip.budgetMinor === null ? <Link to={`/trips/${trip.id}/edit`}>Set total budget</Link> : <small>{formatMoney(Math.round(trip.budgetMinor / Math.max(1, trip.members.length)), trip.currency)} avg. per person</small>}</div></article>
      <article><span className="expense-summary-icon">♙</span><div><small>Your balance</small><strong>{formatMoney(Math.abs(currentBalance), summary.currency)}</strong><small className={currentBalance < 0 ? "expense-negative" : "expense-positive"}>{currentBalance < 0 ? "you owe" : currentBalance > 0 ? "owed to you" : "all settled"}</small></div></article>
    </div> : null}
    {showForm ? <form className="expense-form expense-form-simple" onSubmit={submit}>
      <div className="expense-step"><span>1</span><div><strong>{editing ? "Edit the expense" : "What was the expense?"}</strong><small>For example: dinner, train tickets or hotel</small></div></div>
      <label className="form-field"><span>Description</span><input required minLength={2} placeholder="Group dinner" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
      <label className="form-field"><span>Amount ({trip.currency})</span><input required inputMode="decimal" placeholder="45.90" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
      <div className="expense-step"><span>2</span><div><strong>Who paid?</strong><small>Select the person who paid the bill</small></div></div>
      <label className="form-field expense-full-width"><select aria-label="Paid by" value={paidById} onChange={(e) => setPaidById(e.target.value)}>{trip.members.map((member) => <option key={member.user.id} value={member.user.id}>{member.user.displayName}</option>)}</select></label>
      <div className="expense-step"><span>3</span><div><strong>Who shared this expense?</strong><small>Everyone selected below will pay an equal share</small></div></div>
      <fieldset className="split-field"><legend className="visually-hidden">People sharing the expense</legend>{trip.members.map((member) => <label className="participant-row" key={member.user.id}><input type="checkbox" checked={participants.includes(member.user.id)} onChange={() => toggleParticipant(member.user.id)} /><Avatar name={member.user.displayName} photo={member.user.avatarDataUrl} /><span>{member.user.displayName}</span>{splitMode === "custom" && participants.includes(member.user.id) ? <input aria-label={`${member.user.displayName} share`} inputMode="decimal" placeholder="0.00" value={customAmounts[member.user.id] ?? ""} onChange={(e) => setCustomAmounts((current) => ({ ...current, [member.user.id]: e.target.value }))} /> : null}</label>)}</fieldset>
      <button className="expense-options-toggle text-button" type="button" onClick={() => setShowAdvanced((value) => !value)}>{showAdvanced ? "Hide more options" : "More options: custom split, date and notes"}</button>
      {showAdvanced ? <div className="expense-advanced"><div className="split-mode"><button className={splitMode === "equal" ? "active" : "secondary-button"} type="button" onClick={() => setSplitMode("equal")}>Split equally</button><button className={splitMode === "custom" ? "active" : "secondary-button"} type="button" onClick={() => setSplitMode("custom")}>Enter custom amounts</button></div><label className="form-field"><span>Date</span><input required type="date" value={incurredAt} onChange={(e) => setIncurredAt(e.target.value)} /></label><label className="form-field"><span>Optional notes</span><textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></label></div> : null}
      {error ? <p className="form-message form-message-error" role="alert">{error}</p> : null}<div className="activity-form-actions"><button disabled={working || participants.length === 0}>{working ? "Saving…" : editing ? "Save changes" : "Save expense"}</button><button className="secondary-button" type="button" onClick={reset}>Cancel</button></div>
    </form> : null}
    <div className="expense-content-grid">
      <main className="expense-table-panel"><h3>Recent expenses</h3><div className="expense-filters"><select aria-label="Filter by payer" value={payerFilter} onChange={(e) => setPayerFilter(e.target.value)}><option value="all">All payers</option>{trip.members.map((member) => <option key={member.user.id} value={member.user.id}>{member.user.displayName}</option>)}</select><input aria-label="Search expenses" placeholder="Search expenses" value={search} onChange={(e) => setSearch(e.target.value)} /></div><div className="expense-table-head"><span>Date</span><span>Description</span><span>Paid by</span><span>Split with</span><span>Category</span><span>Amount</span><span /></div><div className="expense-list">{visibleExpenses.map((expense) => { const canEdit = trip.role === "OWNER" || expense.paidBy.id === currentUserId; return <article className="expense-row" key={expense.id}><time>{new Date(expense.incurredAt).toLocaleDateString()}</time><div><strong>{expense.title}</strong><small>{categoryFor(expense.title)}</small></div><div className="expense-person"><Avatar name={expense.paidBy.displayName} photo={memberPhoto(expense.paidBy.id)} /><span>{expense.paidBy.displayName}</span></div><div className="expense-split-stack">{expense.shares.slice(0, 4).map((share) => <Avatar key={share.user.id} name={share.user.displayName} photo={memberPhoto(share.user.id)} />)}</div><span>{categoryFor(expense.title)}</span><strong>{formatMoney(expense.amountMinor, expense.currency)}</strong>{canEdit ? <div><button className="text-button" onClick={() => startEdit(expense)}>Edit</button><button className="text-button danger-text" onClick={() => void remove(expense)}>Delete</button></div> : <span />}</article>; })}{!visibleExpenses.length ? <p className="expense-empty">No expenses match these filters.</p> : null}</div><button className="expense-add-row" type="button" onClick={() => setShowForm(true)}>＋ New cost</button></main>
      <aside className="expense-side-panel">
        {summary ? <section><h3>Who owes whom</h3><div className="expense-balance-list">{summary.balances.map((balance) => <div key={balance.user.id}><Avatar name={balance.user.displayName} photo={memberPhoto(balance.user.id)} /><span><strong>{balance.user.displayName}{balance.user.id === currentUserId ? " (you)" : ""}</strong><small className={balance.amountMinor < 0 ? "expense-negative" : "expense-positive"}>{balance.amountMinor < 0 ? "owes" : balance.amountMinor > 0 ? "is owed" : "settled"}</small></span><b>{formatMoney(Math.abs(balance.amountMinor), summary.currency)}</b></div>)}</div>{summary.settlements.length ? <div className="expense-settlements">{summary.settlements.map((item, index) => <p key={`${item.from.id}-${item.to.id}-${index}`}><strong>{item.from.displayName}</strong> pays <strong>{item.to.displayName}</strong> {formatMoney(item.amountMinor, summary.currency)}</p>)}</div> : null}</section> : null}
        {summary ? <section><h3>Top categories</h3><div className="category-chart-wrap"><div className="category-donut" role="img" aria-label="Expense category chart" /><div>{categoryTotals.map(([category, total], index) => <p key={category}><i className={`category-dot category-${index}`} /><span>{category}</span><strong>{formatMoney(total, summary.currency)}</strong></p>)}</div></div><footer><span>Total</span><strong>{formatMoney(summary.totalMinor, summary.currency)}</strong></footer></section> : null}
      </aside>
    </div>
  </section>;
}
