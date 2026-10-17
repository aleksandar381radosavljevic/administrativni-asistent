import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithProviders } from "@/test/render";
import { AssistantPromo } from "./AssistantPromo";

describe("AssistantPromo", () => {
  it("points to the assistant", () => {
    renderWithProviders(<AssistantPromo />);

    expect(
      screen.getByRole("heading", { level: 2, name: "Zapelo ti je negde?" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Pitaj asistenta" }),
    ).toHaveAttribute("href", "/ai");
  });
});
