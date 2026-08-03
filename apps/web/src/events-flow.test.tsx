import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as activityApi from "./activities/activity-api";
import * as eventApi from "./events/event-api";
import { EventDiscoverySection } from "./events/EventDiscoverySection";

vi.mock("./activities/activity-api");
vi.mock("./events/event-api");

const tripId = "11111111-1111-4111-8111-111111111111";
beforeEach(() => vi.clearAllMocks());

describe("events frontend flow", () => {
  it("filters events and adds one to the itinerary", async () => {
    vi.mocked(eventApi.getTripEvents).mockResolvedValue({
      status: "AVAILABLE", location: { name: "London", country: "United Kingdom" }, attribution: "Event data provided by Ticketmaster",
      events: [
        { id: "music-1", name: "Live in London", url: "https://example.com/tickets", startDateTime: "2027-09-11T18:30:00Z", endDateTime: null, status: "onsale", category: "Music", genre: "Rock", imageUrl: null, venue: { name: "Roundhouse", address: "Chalk Farm Road", city: "London", country: "United Kingdom", latitude: 51.5, longitude: -0.1 }, price: { minimum: 25, maximum: 70, currency: "GBP" } },
        { id: "sport-1", name: "City Match", url: "https://example.com/match", startDateTime: "2027-09-12T14:00:00Z", endDateTime: null, status: "onsale", category: "Sports", genre: null, imageUrl: null, venue: { name: "City Stadium", address: null, city: "London", country: "United Kingdom", latitude: null, longitude: null }, price: null },
      ],
    });
    vi.mocked(activityApi.createActivity).mockResolvedValue({} as never);
    const onActivityAdded = vi.fn();
    render(<EventDiscoverySection destination="London" onActivityAdded={onActivityAdded} tripId={tripId} tripStartDate="2027-09-11" />);

    expect(await screen.findByText("Live in London")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Music" }));
    expect(screen.queryByText("City Match")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /add to itinerary/i }));

    await waitFor(() => expect(activityApi.createActivity).toHaveBeenCalledWith(tripId, {
      title: "Live in London",
      description: "Live event discovered with TripSync · Rock",
      location: "Roundhouse, Chalk Farm Road, London",
      startsAt: "2027-09-11T18:30:00Z",
      endsAt: null,
    }));
    expect(onActivityAdded).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Added" })).toBeDisabled();
  });

  it("shows preview events when the provider key is absent", async () => {
    vi.mocked(eventApi.getTripEvents).mockResolvedValue({ status: "NOT_CONFIGURED", message: "Live event discovery needs one server setting before events can load." });
    render(<EventDiscoverySection destination="London" onActivityAdded={vi.fn()} tripId={tripId} tripStartDate="2027-09-11" />);
    expect(await screen.findByText("City Lights Live")).toBeInTheDocument();
    expect(screen.getByText(/preview data/i)).toBeInTheDocument();
  });
});
