import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LanguageSelector } from "../components/LanguageSelector";
import { LocalisationProvider } from "./LocalisationProvider";

describe("localisation", () => {
  it("translates interface text when the language changes", async () => {
    const view = render(<LocalisationProvider><LanguageSelector /><p>Shared expenses</p></LocalisationProvider>);
    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "gu" } });
    await waitFor(() => expect(screen.getByText("સહિયારા ખર્ચ")).toBeInTheDocument());
    expect(document.documentElement.lang).toBe("gu");
    view.unmount();
  });
});
