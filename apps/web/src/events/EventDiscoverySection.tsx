import { useEffect, useMemo, useState } from "react";

import { createActivity } from "../activities/activity-api";
import { ApiError } from "../lib/api";
import { getTripEvents } from "./event-api";
import type { LiveEvent, TripEvents } from "./event-types";
import { previewEvents } from "../preview/travel-preview";

type Props = { tripId: string; destination: string; tripStartDate: string; onActivityAdded: () => void };

const formatWhen = (value: string) => new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
}).format(new Date(value));

const formatPrice = (event: LiveEvent) => {
  if (!event.price) return "Check ticket price";
  const amount = event.price.minimum ?? event.price.maximum;
  if (amount === null) return "Check ticket price";
  return `From ${new Intl.NumberFormat("en-GB", { style: "currency", currency: event.price.currency }).format(amount)}`;
};

export function EventDiscoverySection({ tripId, destination, tripStartDate, onActivityAdded }: Props) {
  const [result, setResult] = useState<TripEvents | null>(null);
  const [category, setCategory] = useState("ALL");
  const [error, setError] = useState("");
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<string[]>([]);

  useEffect(() => {
    let isActive = true;
    getTripEvents(tripId)
      .then((events) => { if (isActive) setResult(events.status === "AVAILABLE" ? events : previewEvents(destination, tripStartDate)); })
      .catch(() => {
        if (isActive) setResult(previewEvents(destination, tripStartDate));
      });
    return () => { isActive = false; };
  }, [destination, tripId, tripStartDate]);

  const categories = useMemo(() => result?.status === "AVAILABLE"
    ? ["ALL", ...new Set(result.events.map((event) => event.category))]
    : ["ALL"], [result]);
  const visibleEvents = useMemo(() => result?.status === "AVAILABLE"
    ? result.events.filter((event) => category === "ALL" || event.category === category)
    : [], [category, result]);

  const addToItinerary = async (event: LiveEvent) => {
    setAddingId(event.id);
    setError("");
    try {
      await createActivity(tripId, {
        title: event.name,
        description: `Live event discovered with TripSync · ${event.genre ?? event.category}`,
        location: [event.venue.name, event.venue.address, event.venue.city].filter(Boolean).join(", "),
        startsAt: event.startDateTime,
        endsAt: event.endDateTime,
      });
      setAddedIds((current) => [...current, event.id]);
      onActivityAdded();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "TripSync could not add this event to the itinerary.");
    } finally {
      setAddingId(null);
    }
  };

  return (
    <section className="events-section" aria-labelledby="events-heading">
      <div className="itinerary-heading">
        <div><p className="eyebrow">What is on</p><h2 id="events-heading">Experience the city live.</h2><p>Find real concerts, sport, theatre and family events during your trip.</p></div>
      </div>
      {error ? <div className="form-message form-message-error" role="alert">{error}</div> : null}
      {!error && !result ? <div className="events-message">Finding events for your dates…</div> : null}
      {result?.status === "NOT_CONFIGURED" ? <div className="events-message"><strong>Event discovery is nearly ready</strong><p>{result.message}</p></div> : null}
      {result?.status === "UNAVAILABLE" ? <div className="events-message"><strong>Events unavailable</strong><p>{result.message}</p></div> : null}
      {result?.status === "AVAILABLE" ? (
        <>
          {result.isPreview ? <div className="preview-banner"><strong>Preview data</strong><span>Add examples to the itinerary now; configure Ticketmaster later for live events.</span></div> : null}
          <div className="event-filters" aria-label="Event categories">
            {categories.map((item) => <button className={category === item ? "active" : "secondary-button"} key={item} onClick={() => setCategory(item)} type="button">{item === "ALL" ? "All events" : item}</button>)}
          </div>
          <div className="event-results-heading"><strong>{visibleEvents.length} events</strong><span>in {result.location.name} during this trip</span></div>
          {visibleEvents.length ? <div className="event-grid">{visibleEvents.map((event) => (
            <article className="event-card" key={event.id}>
              {event.imageUrl ? <img alt="" src={event.imageUrl} /> : <div className="event-image-placeholder" aria-hidden="true">Live</div>}
              <div className="event-card-body">
                <span className="event-category">{event.category}{event.genre ? ` · ${event.genre}` : ""}</span>
                <h3>{event.name}</h3>
                <p><strong>{formatWhen(event.startDateTime)}</strong></p>
                <p>{[event.venue.name, event.venue.city].filter(Boolean).join(" · ")}</p>
                <small>{formatPrice(event)}</small>
                <div className="event-actions">
                  <a href={event.url} rel="noreferrer" target="_blank">View tickets</a>
                  <button disabled={addingId === event.id || addedIds.includes(event.id)} onClick={() => void addToItinerary(event)} type="button">{addedIds.includes(event.id) ? "Added" : addingId === event.id ? "Adding…" : "Add to itinerary"}</button>
                </div>
              </div>
            </article>
          ))}</div> : <div className="events-message">No events were found in this category. Try another filter.</div>}
          <small className="events-attribution">{result.attribution}</small>
        </>
      ) : null}
    </section>
  );
}
