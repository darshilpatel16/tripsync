import type { LiveEvent, TripEvents } from "../events/event-types";
import type { TripPlaces } from "../places/place-types";
import type { RouteResult, TransportMode } from "../transport/transport-types";
import type { AvailableTripWeather } from "../weather/weather-types";

const cityCentres: Array<{ match: string; latitude: number; longitude: number }> = [
  { match: "london", latitude: 51.5074, longitude: -0.1278 },
  { match: "paris", latitude: 48.8566, longitude: 2.3522 },
  { match: "rome", latitude: 41.9028, longitude: 12.4964 },
  { match: "new york", latitude: 40.7128, longitude: -74.006 },
  { match: "tokyo", latitude: 35.6762, longitude: 139.6503 },
];

const centreFor = (destination: string) =>
  cityCentres.find((city) => destination.toLowerCase().includes(city.match)) ?? cityCentres[0];

const dateOnly = (value: string) => value.slice(0, 10);
const addDays = (value: string, days: number) => {
  const date = new Date(`${dateOnly(value)}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

export const previewWeather = (destination: string, startDate: string, endDate: string): AvailableTripWeather => {
  const centre = centreFor(destination);
  const lastDay = dateOnly(endDate);
  const dates = Array.from({ length: 5 }, (_, index) => addDays(startDate, index)).filter((date) => date <= lastDay);
  const patterns = [
    { weatherCode: 1, temperatureMaxC: 23, temperatureMinC: 15, precipitationProbability: 10, windSpeedMaxKph: 14 },
    { weatherCode: 2, temperatureMaxC: 21, temperatureMinC: 14, precipitationProbability: 20, windSpeedMaxKph: 18 },
    { weatherCode: 61, temperatureMaxC: 19, temperatureMinC: 13, precipitationProbability: 55, windSpeedMaxKph: 22 },
    { weatherCode: 1, temperatureMaxC: 22, temperatureMinC: 14, precipitationProbability: 15, windSpeedMaxKph: 12 },
    { weatherCode: 0, temperatureMaxC: 24, temperatureMinC: 16, precipitationProbability: 5, windSpeedMaxKph: 10 },
  ];
  return {
    status: "AVAILABLE",
    isPreview: true,
    location: { name: destination, region: null, country: null, latitude: centre.latitude, longitude: centre.longitude, timezone: "Preview" },
    forecast: { startDate: dates[0] ?? dateOnly(startDate), endDate: dates.at(-1) ?? dateOnly(endDate), isPartial: true },
    days: dates.map((date, index) => ({ date, ...patterns[index % patterns.length]! })),
    attribution: "Preview forecast for portfolio demonstration",
  };
};

export const previewPlaces = (destination: string): TripPlaces => {
  const centre = centreFor(destination);
  const place = (id: string, name: string, category: "RESTAURANT" | "CAFE" | "ATTRACTION" | "MUSEUM", lat: number, lon: number, cuisine: string | null = null) => ({
    id: `preview/${id}`, name, category, latitude: lat, longitude: lon, address: `Central ${destination}`, cuisine, website: null,
    osmUrl: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=15/${lat}/${lon}`,
  });
  return {
    status: "AVAILABLE",
    isPreview: true,
    location: { name: destination, region: null, country: null, latitude: centre.latitude, longitude: centre.longitude },
    places: [
      place("table", "The Local Table", "RESTAURANT", centre.latitude + 0.008, centre.longitude + 0.006, "local;modern"),
      place("roastery", "Central Roastery", "CAFE", centre.latitude - 0.004, centre.longitude + 0.009, "coffee;bakery"),
      place("museum", "City Stories Museum", "MUSEUM", centre.latitude + 0.006, centre.longitude - 0.01),
      place("view", "Panorama Viewpoint", "ATTRACTION", centre.latitude - 0.008, centre.longitude - 0.006),
    ],
    attribution: "Preview places for portfolio demonstration",
  };
};

export const previewEvents = (destination: string, startDate: string): TripEvents => {
  const event = (id: string, name: string, category: string, genre: string, day: number, hour: number, venue: string, price: number): LiveEvent => ({
    id: `preview-${id}`,
    name,
    url: `https://www.ticketmaster.co.uk/search?q=${encodeURIComponent(`${destination} ${category}`)}`,
    startDateTime: `${addDays(startDate, day)}T${String(hour).padStart(2, "0")}:30:00Z`,
    endDateTime: null,
    status: "preview",
    category,
    genre,
    imageUrl: null,
    venue: { name: venue, address: `Central ${destination}`, city: destination, country: null, latitude: null, longitude: null },
    price: { minimum: price, maximum: price + 35, currency: "GBP" },
  });
  return {
    status: "AVAILABLE",
    isPreview: true,
    location: { name: destination, country: null },
    events: [
      event("music", "City Lights Live", "Music", "Live music", 0, 19, "Riverside Hall", 28),
      event("theatre", "Stories After Dark", "Arts & Theatre", "Theatre", 1, 18, "Grand Theatre", 24),
      event("food", "Weekend Food Festival", "Family", "Festival", 2, 12, "Market Square", 12),
    ],
    attribution: "Preview events for portfolio demonstration",
  };
};

export const previewRoute = (destination: string, from: string, to: string, mode: TransportMode): RouteResult => {
  const centre = centreFor(destination);
  const duration = mode === "DRIVING" ? 1080 : mode === "CYCLING" ? 1980 : 4620;
  const coordinates = [
    { latitude: centre.latitude - 0.018, longitude: centre.longitude - 0.024 },
    { latitude: centre.latitude - 0.009, longitude: centre.longitude - 0.012 },
    { latitude: centre.latitude + 0.002, longitude: centre.longitude - 0.004 },
    { latitude: centre.latitude + 0.011, longitude: centre.longitude + 0.011 },
    { latitude: centre.latitude + 0.018, longitude: centre.longitude + 0.025 },
  ];
  return {
    status: "AVAILABLE",
    isPreview: true,
    mode,
    from: { name: from, label: from, ...coordinates[0]! },
    to: { name: to, label: to, ...coordinates.at(-1)! },
    distanceMetres: 6400,
    durationSeconds: duration,
    coordinates,
    steps: [
      { instruction: `Leave ${from} and head towards the city centre`, distanceMetres: 1800, durationSeconds: Math.round(duration * 0.28), roadName: null },
      { instruction: "Continue through the central district", distanceMetres: 2900, durationSeconds: Math.round(duration * 0.45), roadName: null },
      { instruction: `Continue to ${to}`, distanceMetres: 1700, durationSeconds: Math.round(duration * 0.27), roadName: null },
    ],
    attribution: "Preview route for portfolio demonstration",
  };
};
