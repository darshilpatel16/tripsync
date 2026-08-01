import { useEffect, useMemo, useState } from "react";

import { createActivity } from "../activities/activity-api";
import { ApiError } from "../lib/api";
import { DestinationMap } from "./DestinationMap";
import { getTripPlaces } from "./place-api";
import type { Place, PlaceCategory, TripPlaces } from "./place-types";

type Props = { tripId: string; onActivityAdded: () => void };
type Filter = "ALL" | PlaceCategory;

const filters: Array<{ value: Filter; label: string }> = [
  { value: "ALL", label: "All places" },
  { value: "RESTAURANT", label: "Restaurants" },
  { value: "CAFE", label: "Cafés" },
  { value: "ATTRACTION", label: "Attractions" },
  { value: "MUSEUM", label: "Museums" },
];

const categoryLabel = (category: PlaceCategory) =>
  category.charAt(0) + category.slice(1).toLowerCase();

export function PlaceDiscoverySection({ tripId, onActivityAdded }: Props) {
  const [result, setResult] = useState<TripPlaces | null>(null);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [error, setError] = useState("");
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<string[]>([]);

  useEffect(() => {
    let isActive = true;
    getTripPlaces(tripId)
      .then((places) => { if (isActive) setResult(places); })
      .catch((caught) => {
        if (isActive) setError(caught instanceof ApiError ? caught.message : "Nearby places are temporarily unavailable.");
      });
    return () => { isActive = false; };
  }, [tripId]);

  const visiblePlaces = useMemo(
    () => result?.status === "AVAILABLE"
      ? result.places.filter((place) => filter === "ALL" || place.category === filter)
      : [],
    [filter, result],
  );

  const addToItinerary = async (place: Place) => {
    setAddingId(place.id);
    setError("");
    try {
      await createActivity(tripId, {
        title: place.name,
        description: `Discovered with TripSync · ${categoryLabel(place.category)}`,
        location: place.address ?? `${place.latitude.toFixed(5)}, ${place.longitude.toFixed(5)}`,
        startsAt: null,
        endsAt: null,
      });
      setAddedIds((current) => [...current, place.id]);
      onActivityAdded();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "TripSync could not add this place to the itinerary.");
    } finally {
      setAddingId(null);
    }
  };

  return (
    <section className="places-section" aria-labelledby="places-heading">
      <div className="itinerary-heading">
        <div><p className="eyebrow">Explore nearby</p><h2 id="places-heading">Find something memorable.</h2><p>Discover restaurants, cafés and attractions around your destination.</p></div>
      </div>
      {error ? <div className="form-message form-message-error" role="alert">{error}</div> : null}
      {!error && !result ? <div className="places-message">Finding nearby places…</div> : null}
      {result?.status === "UNAVAILABLE" ? <div className="places-message"><strong>Destination not found</strong><p>{result.message}</p></div> : null}
      {result?.status === "AVAILABLE" ? (
        <>
          <div className="place-filters" aria-label="Place categories">
            {filters.map((item) => <button className={filter === item.value ? "active" : "secondary-button"} key={item.value} onClick={() => setFilter(item.value)} type="button">{item.label}</button>)}
          </div>
          <DestinationMap center={result.location} places={visiblePlaces} />
          <div className="place-results-heading"><strong>{visiblePlaces.length} places</strong><span>within approximately 5 km of {result.location.name}</span></div>
          {visiblePlaces.length ? <div className="place-grid">{visiblePlaces.map((place) => (
            <article className="place-card" key={place.id}>
              <span className="place-category">{categoryLabel(place.category)}</span>
              <h3>{place.name}</h3>
              <p>{place.address ?? "Address not available"}</p>
              {place.cuisine ? <small>{place.cuisine.replaceAll(";", " · ")}</small> : null}
              <div className="place-actions">
                <a href={place.osmUrl} rel="noreferrer" target="_blank">View on map</a>
                <button disabled={addingId === place.id || addedIds.includes(place.id)} onClick={() => void addToItinerary(place)} type="button">{addedIds.includes(place.id) ? "Added" : addingId === place.id ? "Adding…" : "Add to itinerary"}</button>
              </div>
            </article>
          ))}</div> : <div className="places-message">No places were found in this category. Try another filter.</div>}
          <small className="places-attribution">{result.attribution}</small>
        </>
      ) : null}
    </section>
  );
}
