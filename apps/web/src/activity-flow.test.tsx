import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ActivitySection } from "./activities/ActivitySection";
import * as activityApi from "./activities/activity-api";
import type { Activity } from "./activities/activity-types";

vi.mock("./activities/activity-api");

const tripId = "11111111-1111-4111-8111-111111111111";
const ownerId = "22222222-2222-4222-8222-222222222222";
const activity: Activity = {
  id: "33333333-3333-4333-8333-333333333333",
  tripId,
  title: "Visit the Colosseum",
  description: "Meet beside the main entrance.",
  location: "Piazza del Colosseo, Rome",
  startsAt: "2026-09-11T09:00:00.000Z",
  endsAt: "2026-09-11T11:00:00.000Z",
  status: "PROPOSED",
  createdAt: "2026-07-31T00:00:00.000Z",
  updatedAt: "2026-07-31T00:00:00.000Z",
  createdBy: {
    id: ownerId,
    displayName: "Darshil Test",
  },
  voting: {
    voted: [],
    notVoted: [{ id: ownerId, displayName: "Darshil Test" }],
    currentUserVoted: false,
  },
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("itinerary activity flow", () => {
  it("loads activities and adds a new proposal", async () => {
    vi.mocked(activityApi.listActivities)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([activity]);
    vi.mocked(activityApi.createActivity).mockResolvedValue(activity);

    render(
      <ActivitySection
        currentUserId={ownerId}
        tripId={tripId}
        tripRole="OWNER"
      />,
    );

    expect(await screen.findByText(/no activities yet/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/activity name/i), {
      target: { value: activity.title },
    });
    fireEvent.change(screen.getByLabelText(/location/i), {
      target: { value: activity.location },
    });
    fireEvent.change(screen.getByLabelText(/starts/i), {
      target: { value: "2026-09-11T10:00" },
    });
    fireEvent.change(screen.getByLabelText(/ends/i), {
      target: { value: "2026-09-11T12:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add to itinerary/i }));

    await waitFor(() => {
      expect(activityApi.createActivity).toHaveBeenCalledWith(tripId, {
        title: activity.title,
        description: null,
        location: activity.location,
        startsAt: new Date("2026-09-11T10:00").toISOString(),
        endsAt: new Date("2026-09-11T12:00").toISOString(),
      });
    });
    expect(await screen.findByRole("heading", { name: activity.title })).toBeInTheDocument();
  });

  it("lets the owner confirm a proposed activity", async () => {
    vi.mocked(activityApi.listActivities)
      .mockResolvedValueOnce([activity])
      .mockResolvedValueOnce([{ ...activity, status: "CONFIRMED" }]);
    vi.mocked(activityApi.updateActivityStatus).mockResolvedValue({
      ...activity,
      status: "CONFIRMED",
    });

    render(
      <ActivitySection
        currentUserId={ownerId}
        tripId={tripId}
        tripRole="OWNER"
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Confirm" }));

    await waitFor(() => {
      expect(activityApi.updateActivityStatus).toHaveBeenCalledWith(
        tripId,
        activity.id,
        "CONFIRMED",
      );
    });
    expect(await screen.findByText("Confirmed")).toBeInTheDocument();
  });

  it("lets the creator edit and delete their proposal", async () => {
    const updated = { ...activity, title: "Colosseum guided tour" };
    vi.mocked(activityApi.listActivities)
      .mockResolvedValueOnce([activity])
      .mockResolvedValueOnce([updated])
      .mockResolvedValueOnce([]);
    vi.mocked(activityApi.updateActivity).mockResolvedValue(updated);
    vi.mocked(activityApi.deleteActivity).mockResolvedValue(undefined);
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(
      <ActivitySection
        currentUserId={ownerId}
        tripId={tripId}
        tripRole="MEMBER"
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Edit" }));
    const titleInput = screen.getByDisplayValue(activity.title);
    fireEvent.change(titleInput, { target: { value: updated.title } });
    fireEvent.click(screen.getByRole("button", { name: /save activity/i }));

    expect(await screen.findByRole("heading", { name: updated.title })).toBeInTheDocument();
    expect(activityApi.updateActivity).toHaveBeenCalledWith(
      tripId,
      activity.id,
      expect.objectContaining({ title: updated.title }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => {
      expect(activityApi.deleteActivity).toHaveBeenCalledWith(tripId, activity.id);
    });
    expect(await screen.findByText(/no activities yet/i)).toBeInTheDocument();
  });

  it("shows who voted, who is waiting, and lets the user change their vote", async () => {
    const votedActivity: Activity = {
      ...activity,
      voting: {
        voted: [{ id: ownerId, displayName: "Darshil Test" }],
        notVoted: [{ id: "member-2", displayName: "Aisha Traveller" }],
        currentUserVoted: true,
      },
    };
    const removedVoteActivity: Activity = {
      ...activity,
      voting: {
        voted: [],
        notVoted: [
          { id: ownerId, displayName: "Darshil Test" },
          { id: "member-2", displayName: "Aisha Traveller" },
        ],
        currentUserVoted: false,
      },
    };
    vi.mocked(activityApi.listActivities)
      .mockResolvedValueOnce([votedActivity])
      .mockResolvedValueOnce([removedVoteActivity]);
    vi.mocked(activityApi.removeActivityVote).mockResolvedValue(removedVoteActivity);

    render(
      <ActivitySection currentUserId={ownerId} tripId={tripId} tripRole="MEMBER" />,
    );

    fireEvent.click(await screen.findByText(/1 voted · 1 waiting/i));
    expect(screen.getByText("Darshil Test")).toBeInTheDocument();
    expect(screen.getByText("Aisha Traveller")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /remove my vote/i }));
    await waitFor(() => {
      expect(activityApi.removeActivityVote).toHaveBeenCalledWith(tripId, activity.id);
    });
    expect(await screen.findByRole("button", { name: /i'm interested/i })).toBeInTheDocument();
  });
});
