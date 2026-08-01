export type PlaceCategory = "RESTAURANT" | "CAFE" | "ATTRACTION" | "MUSEUM";

export type Place = {
  id: string;
  name: string;
  category: PlaceCategory;
  latitude: number;
  longitude: number;
  address: string | null;
  cuisine: string | null;
  website: string | null;
  osmUrl: string;
};

export type TripPlaces =
  | {
      status: "AVAILABLE";
      location: { name: string; region: string | null; country: string | null; latitude: number; longitude: number };
      places: Place[];
      attribution: string;
    }
  | {
      status: "UNAVAILABLE";
      reason: "LOCATION_NOT_FOUND";
      message: string;
    };
