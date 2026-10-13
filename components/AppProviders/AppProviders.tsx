"use client";

import { OsnovaProvider } from "@aleksandar381radosavljevic/osnova-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { appIcons } from "@/lib/icons/registry";

// A client file because a server layout cannot pass components (Link, icons)
// as props to a client provider.
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <OsnovaProvider linkComponent={Link} icons={appIcons}>
      {children}
    </OsnovaProvider>
  );
}
