import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { CHECKLIST_KEY } from "@/lib/checklist/storage";
import { lifeEventDetail } from "@/test/fixtures";
import { renderWithProviders } from "@/test/render";
import { ChecklistView } from "./ChecklistView";

const [registration, idCard] = lifeEventDetail.procedures;

// The checklist store lives for the whole file, so each test starts from an
// empty storage and tells a mounted store to re-read it, as another tab would.
afterEach(() => {
  window.localStorage.clear();
  act(() => {
    window.dispatchEvent(new StorageEvent("storage", { key: null }));
  });
});

function card(title: string) {
  return screen.getByRole("link", { name: title }).closest("li")!;
}

function statusGroup(title: string) {
  return screen.getByRole("group", { name: title });
}

describe("ChecklistView", () => {
  it("starts with nothing done and the order dependency shown", () => {
    renderWithProviders(<ChecklistView lifeEvent={lifeEventDetail} />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: `Checklist: ${lifeEventDetail.title}`,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("0 / 2 završeno")).toBeInTheDocument();
    expect(
      within(statusGroup(registration.title)).getByRole("radio", {
        name: "Nije počelo",
      }),
    ).toBeChecked();
    expect(
      within(card(idCard.title)).getByText(
        `Zavisi od: ${registration.title} (još nije završeno)`,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Napredak se čuva lokalno u ovom pretraživaču/),
    ).toBeInTheDocument();
  });

  it("saves a status, updates the progress and unblocks dependents", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChecklistView lifeEvent={lifeEventDetail} />);

    await user.click(
      within(statusGroup(registration.title)).getByRole("radio", {
        name: "Završeno",
      }),
    );

    expect(screen.getByText("1 / 2 završeno")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      `${registration.title}: Završeno. 1 / 2 završeno.`,
    );
    expect(
      within(card(idCard.title)).queryByText(/još nije završeno/),
    ).not.toBeInTheDocument();
    expect(
      JSON.parse(window.localStorage.getItem(CHECKLIST_KEY)!).items[
        registration.procedure_id
      ].status,
    ).toBe("done");
  });

  it("lets the user start a blocked procedure but warns about the order", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChecklistView lifeEvent={lifeEventDetail} />);

    await user.click(
      within(statusGroup(idCard.title)).getByRole("radio", { name: "U toku" }),
    );

    expect(
      within(statusGroup(idCard.title)).getByRole("radio", { name: "U toku" }),
    ).toBeChecked();
    expect(
      within(card(idCard.title)).getByText(
        `Ova procedura zavisi od ${registration.title}, koja još nije završena. Možeš da nastaviš, ali proveri redosled.`,
      ),
    ).toBeInTheDocument();
  });

  it("resets this event's procedures only after confirmation", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChecklistView lifeEvent={lifeEventDetail} />);
    window.localStorage.setItem(
      CHECKLIST_KEY,
      JSON.stringify({
        v: 1,
        items: {
          [registration.procedure_id]: {
            status: "done",
            updatedAt: "2026-10-12T10:00:00Z",
          },
          "other-event-procedure": {
            status: "done",
            updatedAt: "2026-10-12T10:00:00Z",
          },
        },
      }),
    );
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: CHECKLIST_KEY }));
    });
    expect(screen.getByText("1 / 2 završeno")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Poništi napredak" }));
    const dialog = screen.getByRole("dialog", { name: "Poništi napredak" });
    await user.click(within(dialog).getByRole("button", { name: "Odustani" }));
    expect(screen.getByText("1 / 2 završeno")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Poništi napredak" }));
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Poništi",
      }),
    );

    expect(screen.getByText("0 / 2 završeno")).toBeInTheDocument();
    expect(
      JSON.parse(window.localStorage.getItem(CHECKLIST_KEY)!).items,
    ).toHaveProperty("other-event-procedure");
  });
});
