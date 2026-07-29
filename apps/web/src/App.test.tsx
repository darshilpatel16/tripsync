import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { App } from "./App";

describe("App", () => {
  it("describes the TripSync value proposition", () => {
    render(<App />);
    expect(
      screen.getByRole("heading", { name: /one trip\. one plan/i }),
    ).toBeInTheDocument();
  });
});

