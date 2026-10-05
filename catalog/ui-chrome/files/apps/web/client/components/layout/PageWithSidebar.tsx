"use client";

import { Button } from "@client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@client/components/ui/dialog";
import { SidebarPanelProvider } from "./sidebarPanelContext";
import { cn } from "@client/lib/utils";
import { ChevronRight, PanelRight } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

export type SidebarMobileSummary = {
  title: string;
  description: string;
};

type PageWithSidebarProps = {
  children: ReactNode;
  sidebar: ReactNode;
  /**
   * Short control shown below the `lg` breakpoint. It opens `sidebar` in a
   * dialog so the info cards do not stack above the main column.
   */
  mobileSummary?: SidebarMobileSummary | null;
};

const LG_QUERY = "(min-width: 1024px)";

/**
 * `null` until mount so the first paint can use CSS (`hidden` / `lg:block`)
 * without a hydration mismatch. After mount, the unused tree is unmounted so
 * a phone does not keep a second copy of the sidebar in the document.
 */
function useIsLg(): boolean | null {
  const [isLg, setIsLg] = useState<boolean | null>(null);

  useEffect(() => {
    const media = window.matchMedia?.(LG_QUERY);
    if (!media) {
      setIsLg(window.innerWidth >= 1024);
      return;
    }
    const update = () => setIsLg(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return isLg;
}

/**
 * Main column + sticky aside. Below `lg`, a content-aware summary replaces the
 * aside and opens those same cards in a dialog.
 */
export function PageWithSidebar({
  children,
  sidebar,
  mobileSummary,
}: PageWithSidebarProps) {
  const isLg = useIsLg();
  const [open, setOpen] = useState(false);
  const collapseOnMobile = Boolean(mobileSummary);
  const mountAside = !collapseOnMobile || isLg !== false;
  const mountLauncher = collapseOnMobile && isLg !== true;

  useEffect(() => {
    if (isLg) setOpen(false);
  }, [isLg]);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        {mountAside ? (
          <aside
            className={cn(
              "space-y-4 lg:sticky lg:top-20 lg:order-2",
              collapseOnMobile && "hidden lg:block",
            )}
          >
            {sidebar}
          </aside>
        ) : null}
        <div className="min-w-0 space-y-8">
          {mountLauncher && mobileSummary ? (
            <Button
              type="button"
              variant="outline"
              className="h-auto w-full justify-start gap-3 px-3 py-2.5 text-left whitespace-normal lg:hidden"
              aria-haspopup="dialog"
              aria-expanded={open}
              aria-label={`Open ${mobileSummary.title}`}
              onClick={() => setOpen(true)}
            >
              <PanelRight aria-hidden className="size-4 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{mobileSummary.title}</span>
                <span className="text-muted-foreground mt-0.5 line-clamp-2 block text-xs leading-snug font-normal">
                  {mobileSummary.description}
                </span>
              </span>
              <ChevronRight aria-hidden className="size-4 shrink-0" />
            </Button>
          ) : null}
          {children}
        </div>
      </div>
      {collapseOnMobile && mobileSummary ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="pt-12">
            <DialogHeader>
              <DialogTitle className="sr-only">{mobileSummary.title}</DialogTitle>
            </DialogHeader>
            {open && isLg !== true ? (
              <SidebarPanelProvider>
                <div className="space-y-4">{sidebar}</div>
              </SidebarPanelProvider>
            ) : null}
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
