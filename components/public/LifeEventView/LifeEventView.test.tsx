import { act, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CHECKLIST_KEY } from "@/lib/checklist/storage";
import { lifeEventDetail } from "@/test/fixtures";
import { renderWithProviders } from "@/test/render";
import { LifeEventView } from "./LifeEventView";

const [registration, idCard] = lifeEventDetail.procedures;

function phase(name: RegExp) {
  return screen.getByRole("heading", { level: 2, name }).closest("li")!;
}

describe("LifeEventView", () => {
  it("shows the event with a link back to its category and to the checklist", () => {
    renderWithProviders(
      <LifeEventView lifeEvent={lifeEventDetail} tone="category-2" />,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: lifeEventDetail.title }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: lifeEventDetail.category.name }),
    ).toHaveAttribute("href", "/#kategorija-preseljenje-i-adresa");
    const checklistLinks = screen.getAllByRole("link", {
      name: "Otvori checklist",
    });
    expect(checklistLinks).not.toHaveLength(0);
    for (const link of checklistLinks) {
      expect(link).toHaveAttribute(
        "href",
        "/dogadjaj/selim-se-na-novu-adresu/checklist",
      );
    }
    expect(screen.getByText("2 procedure")).toBeInTheDocument();
    expect(screen.getByText("~2 nedelje")).toBeInTheDocument();
  });

  it("says the event is free only when every procedure is free", () => {
    const { unmount } = renderWithProviders(
      <LifeEventView lifeEvent={lifeEventDetail} tone="category-2" />,
    );
    const header = screen.getByRole("banner");
    expect(within(header).queryByText("Besplatno")).not.toBeInTheDocument();
    unmount();

    renderWithProviders(
      <LifeEventView
        lifeEvent={{
          ...lifeEventDetail,
          procedures: lifeEventDetail.procedures.map((p) => ({
            ...p,
            cost_type: "free" as const,
            cost_amount: null,
          })),
        }}
        tone="category-2"
      />,
    );
    expect(
      within(screen.getByRole("banner")).getByText("Besplatno"),
    ).toBeInTheDocument();
  });

  it("puts a procedure after the one it depends on, in a later phase", () => {
    renderWithProviders(
      <LifeEventView lifeEvent={lifeEventDetail} tone="category-2" />,
    );

    const first = phase(/Faza 1, možeš odmah, paralelno/);
    const second = phase(/Faza 2, posle procedura od kojih zavise/);
    expect(
      within(first).getByRole("link", { name: registration.title }),
    ).toHaveAttribute(
      "href",
      "/procedura/prijava-prebivalista?dogadjaj=selim-se-na-novu-adresu",
    );
    expect(
      within(second).getByRole("link", { name: idCard.title }),
    ).toBeInTheDocument();
    expect(
      within(second).getByText(`Zavisi od: ${registration.title}`),
    ).toBeInTheDocument();
  });

  it("shows methods, cost and the stale warning on the cards", () => {
    renderWithProviders(
      <LifeEventView lifeEvent={lifeEventDetail} tone="category-2" />,
    );

    const first = phase(/Faza 1/);
    const second = phase(/Faza 2/);
    expect(within(first).getByText("Lično")).toBeInTheDocument();
    expect(within(first).getByText("Besplatno")).toBeInTheDocument();
    expect(
      within(first).queryByText("Proveri podatke"),
    ).not.toBeInTheDocument();
    expect(within(first).getByText("1 dan")).toBeInTheDocument();
    expect(within(first).getByText("[TEST] MUP")).toBeInTheDocument();
    expect(within(second).getByText("1.500 din")).toBeInTheDocument();
    expect(within(second).getByText("Proveri podatke")).toBeInTheDocument();
  });

  it("shows the user's checklist status, also when another tab changes it", () => {
    renderWithProviders(
      <LifeEventView lifeEvent={lifeEventDetail} tone="category-2" />,
    );
    expect(screen.queryByText("Završeno")).not.toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: "0 / 2 završeno" }),
    ).toBeInTheDocument();

    window.localStorage.setItem(
      CHECKLIST_KEY,
      JSON.stringify({
        v: 1,
        items: {
          [registration.procedure_id]: {
            status: "done",
            updatedAt: "2026-10-12T10:00:00Z",
          },
        },
      }),
    );
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: CHECKLIST_KEY }));
    });

    expect(within(phase(/Faza 1/)).getByText("Završeno")).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: "1 / 2 završeno" }),
    ).toBeInTheDocument();
    expect(
      within(phase(/Faza 2/)).queryByText("Završeno"),
    ).not.toBeInTheDocument();
  });
});
