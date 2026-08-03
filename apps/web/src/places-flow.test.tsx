import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as activityApi from "./activities/activity-api";
import { PlaceDiscoverySection } from "./places/PlaceDiscoverySection";
import * as placeApi from "./places/place-api";

vi.mock("./activities/activity-api");
vi.mock("./places/place-api");
vi.mock("./places/DestinationMap", () => ({ DestinationMap: () => <div>Interactive map</div> }));

const tripId = "11111111-1111-4111-8111-111111111111";

beforeEach(() => vi.clearAllMocks());

describe("places frontend flow", () => {
  it("filters nearby places and adds one to the itinerary", async () => {
    vi.mocked(placeApi.getTripPlaces).mockResolvedValue({
      status: "AVAILABLE",
      location: { name: "Rome", region: "Lazio", country: "Italy", latitude: 41.9, longitude: 12.5 },
      places: [
        { id: "node/1", name: "Pasta House", category: "RESTAURANT", latitude: 41.91, longitude: 12.51, address: "Via Roma", cuisine: "italian", website: null, osmUrl: "https://www.openstreetmap.org/node/1" },
        { id: "way/2", name: "City Museum", category: "MUSEUM", latitude: 41.92, longitude: 12.52, address: null, cuisine: null, website: null, osmUrl: "https://www.openstreetmap.org/way/2" },
      ],
      attribution: "Place data © OpenStreetMap contributors",
    });
    vi.mocked(activityApi.createActivity).mockResolvedValue({} as never);
    const onActivityAdded = vi.fn();

    render(<PlaceDiscoverySection destination="Rome, Italy" onActivityAdded={onActivityAdded} tripId={tripId} />);
    expect(await screen.findByText("Pasta House")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Restaurants" }));
    expect(screen.queryByText("City Museum")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /add to itinerary/i }));

    await waitFor(() => expect(activityApi.createActivity).toHaveBeenCalledWith(tripId, {
      title: "Pasta House",
      description: "Discovered with TripSync · Restaurant",
      location: "Via Roma",
      startsAt: null,
      endsAt: null,
    }));
    expect(onActivityAdded).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Added" })).toBeDisabled();
  });
});
