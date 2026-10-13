import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement } from "react";
import { AppProviders } from "@/components/AppProviders/AppProviders";

/** Renders inside the app's Osnova provider, so icons and links resolve like in the app. */
export function renderWithProviders(ui: ReactElement, options?: RenderOptions) {
  return render(ui, { wrapper: AppProviders, ...options });
}
