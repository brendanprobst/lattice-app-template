"use client";

import type { ReactNode } from "react";

/** Nav highlight key. Spawn header maps this; feed/search are not required. */
export type AppShellActive = "home" | "profile" | (string & {});

type AppShellProps = {
  children: ReactNode;
  active?: AppShellActive;
  /** Spawn supplies AppHeader (or equivalent). Do not import AppHeader from this catalog. */
  header?: ReactNode;
};

export function AppShell({ children, header }: AppShellProps) {
  return (
    <div className="bg-background text-foreground min-h-screen">
      {header}
      {children}
    </div>
  );
}
