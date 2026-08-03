export type LiveEvent = {
  id: string;
  name: string;
  url: string;
  startDateTime: string;
  endDateTime: string | null;
  status: string | null;
  category: string;
  genre: string | null;
  imageUrl: string | null;
  venue: {
    name: string | null;
    address: string | null;
    city: string;
    country: string | null;
    latitude: number | null;
    longitude: number | null;
  };
  price: { minimum: number | null; maximum: number | null; currency: string } | null;
};

export type TripEvents =
  | { status: "AVAILABLE"; isPreview?: boolean; location: { name: string; country: string | null }; events: LiveEvent[]; attribution: string }
  | { status: "NOT_CONFIGURED"; message: string }
  | { status: "UNAVAILABLE"; reason: "LOCATION_NOT_FOUND" | "TRIP_ENDED"; message: string };
