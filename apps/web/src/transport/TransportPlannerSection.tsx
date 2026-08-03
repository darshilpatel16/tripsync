import { useEffect, useMemo, useState, type FormEvent } from "react";

import { listActivities } from "../activities/activity-api";
import { RouteMap } from "./RouteMap";
import { planRoute } from "./transport-api";
import type { RouteResult, TransportMode } from "./transport-types";
import { previewRoute } from "../preview/travel-preview";

type Props = { tripId: string; destination: string; activityVersion: number };
const modes: Array<{ value: TransportMode; label: string }> = [{ value: "DRIVING", label: "Drive" }, { value: "WALKING", label: "Walk" }, { value: "CYCLING", label: "Cycle" }];
const formatDistance = (metres: number) => metres < 1000 ? `${Math.round(metres)} m` : `${(metres / 1000).toFixed(1)} km`;
const formatDuration = (seconds: number) => {
  const minutes = Math.round(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours ? `${hours} hr${remainder ? ` ${remainder} min` : ""}` : `${minutes} min`;
};

export function TransportPlannerSection({ tripId, destination, activityVersion }: Props) {
  const [from, setFrom] = useState(destination);
  const [to, setTo] = useState("");
  const [mode, setMode] = useState<TransportMode>("DRIVING");
  const [locations, setLocations] = useState<string[]>([destination]);
  const [result, setResult] = useState<RouteResult | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isActive = true;
    listActivities(tripId).then((activities) => {
      if (isActive) setLocations([destination, ...new Set(activities.flatMap((activity) => activity.location ? [activity.location] : []))]);
    }).catch(() => undefined);
    return () => { isActive = false; };
  }, [activityVersion, destination, tripId]);

  const suggestions = useMemo(() => [...new Set(locations)], [locations]);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(""); setResult(null); setIsLoading(true);
    try {
      const planned = await planRoute(tripId, { from, to, mode });
      setResult(planned.status === "AVAILABLE" ? planned : previewRoute(destination, from, to, mode));
    }
    catch { setResult(previewRoute(destination, from, to, mode)); }
    finally { setIsLoading(false); }
  };

  return (
    <section className="transport-section" aria-labelledby="transport-heading">
      <div className="itinerary-heading"><div><p className="eyebrow">Getting around</p><h2 id="transport-heading">Plan the journey, not just the stop.</h2><p>Compare driving, walking, and cycling routes between saved itinerary places or any address.</p></div></div>
      <form className="transport-form" onSubmit={submit}>
        <label className="form-field"><span>Starting from</span><input list="trip-route-locations" onChange={(event) => setFrom(event.target.value)} required value={from} /></label>
        <button aria-label="Swap start and destination" className="route-swap" onClick={() => { setFrom(to); setTo(from); }} type="button">⇄</button>
        <label className="form-field"><span>Going to</span><input list="trip-route-locations" onChange={(event) => setTo(event.target.value)} placeholder="Museum, station, postcode…" required value={to} /></label>
        <datalist id="trip-route-locations">{suggestions.map((location) => <option key={location} value={location} />)}</datalist>
        <div className="transport-modes" aria-label="Travel mode">{modes.map((item) => <button aria-pressed={mode === item.value} className={mode === item.value ? "active" : "secondary-button"} key={item.value} onClick={() => setMode(item.value)} type="button">{item.label}</button>)}</div>
        <button disabled={isLoading} type="submit">{isLoading ? "Planning route…" : "Show route"}</button>
      </form>
      <p className="transport-note">Public transport timetables vary by region and are not estimated in this version.</p>
      {error ? <div className="form-message form-message-error" role="alert">{error}</div> : null}
      {result?.status === "NOT_CONFIGURED" ? <div className="transport-message"><strong>Route planning is nearly ready</strong><p>{result.message}</p></div> : null}
      {result?.status === "UNAVAILABLE" ? <div className="transport-message"><strong>Location not found</strong><p>{result.message}</p></div> : null}
      {result?.status === "AVAILABLE" ? <div className="route-result">
        {result.isPreview ? <div className="preview-banner"><strong>Preview route</strong><span>This demonstrates the route experience. Configure openrouteservice for real street directions.</span></div> : null}
        <div className="route-summary"><div><span>Distance</span><strong>{formatDistance(result.distanceMetres)}</strong></div><div><span>Estimated time</span><strong>{formatDuration(result.durationSeconds)}</strong></div><div><span>Mode</span><strong>{modes.find((item) => item.value === result.mode)?.label}</strong></div></div>
        <RouteMap coordinates={result.coordinates} from={result.from} to={result.to} />
        <details className="route-directions"><summary>Step-by-step directions</summary><ol>{result.steps.map((step, index) => <li key={`${step.instruction}-${index}`}><span>{step.instruction}</span><small>{formatDistance(step.distanceMetres)} · {formatDuration(step.durationSeconds)}</small></li>)}</ol></details>
        <small className="transport-attribution">{result.attribution}</small>
      </div> : null}
    </section>
  );
}
