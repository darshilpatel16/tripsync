const features = [
  ["Plan together", "Build one shared itinerary instead of losing decisions across group chats."],
  ["Decide together", "Propose activities and vote so every traveller has a voice."],
  ["Settle clearly", "Record shared costs and calculate simple, transparent repayments."],
];

export function App() {
  return (
    <main>
      <nav className="nav" aria-label="Primary navigation">
        <a className="brand" href="/">TripSync</a>
        <a className="nav-link" href="#features">How it works</a>
      </nav>

      <section className="hero">
        <p className="eyebrow">Group travel, minus the chaos</p>
        <h1>One trip. One plan. Everyone in sync.</h1>
        <p className="lede">
          Organise the itinerary, agree on activities, and settle shared expenses
          without switching between five different apps.
        </p>
        <div className="actions">
          <button type="button">Start planning</button>
          <a href="#features">Explore features</a>
        </div>
      </section>

      <section className="features" id="features" aria-labelledby="features-title">
        <p className="eyebrow">The essentials</p>
        <h2 id="features-title">Everything your group needs to move forward.</h2>
        <div className="feature-grid">
          {features.map(([title, description], index) => (
            <article className="feature-card" key={title}>
              <span aria-hidden="true">0{index + 1}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

