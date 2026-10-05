"use client";

import { createContext, useContext, type ReactNode } from "react";

/** True when sidebar cards are rendered inside the mobile side-panel dialog. */
const SidebarPanelContext = createContext(false);

export function SidebarPanelProvider({
  children,
}: {
  children: ReactNode;
}) {
  return <SidebarPanelContext.Provider value={true}>{children}</SidebarPanelContext.Provider>;
}

export function useInSidebarPanel(): boolean {
  return useContext(SidebarPanelContext);
}
