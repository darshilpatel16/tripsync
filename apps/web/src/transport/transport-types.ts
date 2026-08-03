export type TransportMode = "DRIVING" | "WALKING" | "CYCLING";
export type RouteResult =
  | { status: "NOT_CONFIGURED"; message: string }
  | { status: "UNAVAILABLE"; reason: "LOCATION_NOT_FOUND"; message: string }
  | {
      status: "AVAILABLE";
      isPreview?: boolean;
      mode: TransportMode;
      from: RoutePlace;
      to: RoutePlace;
      distanceMetres: number;
      durationSeconds: number;
      coordinates: Array<{ latitude: number; longitude: number }>;
      steps: Array<{ instruction: string; distanceMetres: number; durationSeconds: number; roadName: string | null }>;
      attribution: string;
    };

export type RoutePlace = { name: string; label: string; latitude: number; longitude: number };
