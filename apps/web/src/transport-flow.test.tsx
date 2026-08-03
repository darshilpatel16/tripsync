import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as activityApi from "./activities/activity-api";
import * as transportApi from "./transport/transport-api";
import { TransportPlannerSection } from "./transport/TransportPlannerSection";

vi.mock("./activities/activity-api");
vi.mock("./transport/transport-api");
vi.mock("./transport/RouteMap", () => ({ RouteMap: () => <div>Route map</div> }));
const tripId = "11111111-1111-4111-8111-111111111111";
beforeEach(() => { vi.clearAllMocks(); vi.mocked(activityApi.listActivities).mockResolvedValue([{ location: "Tower Bridge" }] as never); });

describe("transport frontend flow", () => {
  it("plans a route using an itinerary location", async () => {
    vi.mocked(transportApi.planRoute).mockResolvedValue({ status: "AVAILABLE", mode: "WALKING", from: { name: "Tower Bridge", label: "Tower Bridge, London", latitude: 51.5, longitude: -0.07 }, to: { name: "British Museum", label: "British Museum, London", latitude: 51.51, longitude: -0.12 }, distanceMetres: 5200, durationSeconds: 3900, coordinates: [{ latitude: 51.5, longitude: -0.07 }, { latitude: 51.51, longitude: -0.12 }], steps: [{ instruction: "Head west", distanceMetres: 400, durationSeconds: 300, roadName: null }], attribution: "Routing provided by openrouteservice" });
    render(<TransportPlannerSection activityVersion={0} destination="London" tripId={tripId} />);
    fireEvent.change(screen.getByLabelText("Starting from"), { target: { value: "Tower Bridge" } });
    fireEvent.change(screen.getByLabelText("Going to"), { target: { value: "British Museum" } });
    fireEvent.click(screen.getByRole("button", { name: "Walk" }));
    fireEvent.click(screen.getByRole("button", { name: "Show route" }));
    await waitFor(() => expect(transportApi.planRoute).toHaveBeenCalledWith(tripId, { from: "Tower Bridge", to: "British Museum", mode: "WALKING" }));
    expect(await screen.findByText("5.2 km")).toBeInTheDocument();
    expect(screen.getByText("1 hr 5 min")).toBeInTheDocument();
    expect(screen.getByText("Route map")).toBeInTheDocument();
  });
});
