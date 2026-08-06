import { WorkspaceShell } from "../components/WorkspaceShell";
import { Link } from "react-router";

const features = [
  ["Plan every detail", "Keep destinations, dates and the group plan together in one calm workspace."],
  ["Build an itinerary", "Add activities in order so everyone knows what is happening and when."],
  ["Share expenses", "Track the trip budget, record costs and understand who owes what."],
  ["Travel together", "See every traveller in one place and keep the whole group in sync."],
];

export function DashboardPage() {
  return <WorkspaceShell>
    <section className="workspace-page dashboard-introduction">
      <div className="dashboard-auth-actions"><Link className="secondary-button" to="/login">Sign in</Link><Link className="primary-action" to="/register">Sign up</Link></div>
      <p className="eyebrow">Welcome to TripSync</p>
      <h1>One place for every part of your group trip.</h1>
      <p className="workspace-lede">TripSync helps friends, families and travel groups organise a shared trip without losing plans across messages, notes and spreadsheets.</p>
      <div className="dashboard-travel-art" role="img" aria-label="Globe, flight path and suitcase illustration"><span className="dashboard-globe">◉</span><span className="dashboard-plane">✈</span><span className="dashboard-pin">●</span><span className="dashboard-case">▣</span><i /></div>

      <section className="purpose-panel">
        <div><h2>What is TripSync for?</h2></div>
        <p>Create a trip, invite your group, build the itinerary together and keep shared spending transparent from the first idea to the journey home.</p>
      </section>

      <div className="workspace-section-heading">
        <p className="eyebrow">How it works</p>
        <h2>Simple from start to finish.</h2>
      </div>
      <div className="how-to-grid">
        <article><strong>1</strong><h3>Create a trip</h3><p>Add the destination, travel dates, currency and optional group budget.</p></article>
        <article><strong>2</strong><h3>Make the plan</h3><p>Open the trip and use each dedicated page to add itinerary items, expenses and members.</p></article>
        <article><strong>3</strong><h3>Stay in sync</h3><p>Everyone sees the same up-to-date plan, costs and group information.</p></article>
      </div>

      <div className="workspace-section-heading feature-heading">
        <p className="eyebrow">Features</p>
        <h2>Everything your group needs.</h2>
      </div>
      <div className="product-feature-grid">
        {features.map(([title, description]) => <article key={title}><h3>{title}</h3><p>{description}</p></article>)}
      </div>
    </section>
  </WorkspaceShell>;
}
