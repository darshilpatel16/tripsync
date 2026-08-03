export type WeatherDay = {
  date: string;
  weatherCode: number;
  temperatureMaxC: number;
  temperatureMinC: number;
  precipitationProbability: number;
  windSpeedMaxKph: number;
};

export type AvailableTripWeather = {
  status: "AVAILABLE";
  isPreview?: boolean;
  location: {
    name: string;
    region: string | null;
    country: string | null;
    latitude: number;
    longitude: number;
    timezone: string;
  };
  forecast: { startDate: string; endDate: string; isPartial: boolean };
  days: WeatherDay[];
  attribution: string;
};

export type UnavailableTripWeather = {
  status: "UNAVAILABLE";
  reason: "TRIP_ENDED" | "TOO_EARLY" | "LOCATION_NOT_FOUND";
  message: string;
  forecastAvailableFrom?: string;
};

export type TripWeather = AvailableTripWeather | UnavailableTripWeather;
