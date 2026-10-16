import type { Metadata } from "next";
// Osnova tokens, then Osnova components, then the project theme (Osnova rule).
import "@aleksandar381radosavljevic/osnova-tokens/tokens.css";
import "@aleksandar381radosavljevic/osnova-react/styles.css";
import "./theme.css";
import { AppProviders } from "@/components/AppProviders/AppProviders";
import { SiteFooter } from "@/components/public/SiteFooter/SiteFooter";
import {
  MAIN_CONTENT_ID,
  SiteHeader,
} from "@/components/public/SiteHeader/SiteHeader";
import styles from "./layout.module.css";

export const metadata: Metadata = {
  title: "Kako sa državom",
  description:
    "Papirologija u Srbiji, korak po korak: šta ti treba, koliko košta i koji je rok, po životnim događajima.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="sr-Latn">
      <body className={styles.body}>
        <AppProviders>
          <SiteHeader />
          {/* tabIndex lets the skip link move focus, not only scroll. */}
          <main id={MAIN_CONTENT_ID} tabIndex={-1} className={styles.main}>
            {children}
          </main>
          <SiteFooter />
        </AppProviders>
      </body>
    </html>
  );
}
