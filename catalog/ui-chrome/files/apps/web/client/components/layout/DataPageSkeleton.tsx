import { cn } from "@client/lib/utils";

type DataPageSkeletonProps = {
  label: string;
  variant: "profile" | "detail-with-sidebar" | "editor" | "list";
  /** Sit inside an existing page column instead of the full page frame. */
  embedded?: boolean;
};

function Bone({ className }: { className?: string }) {
  return (
    <div
      className={cn("bg-muted animate-pulse rounded-xl ring-1 ring-foreground/5", className)}
    />
  );
}

function ProfileShape() {
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <aside className="hidden space-y-4 lg:sticky lg:top-20 lg:order-2 lg:block">
        <Bone className="h-48" />
      </aside>
      <div className="min-w-0 space-y-8">
        <Bone className="h-16 lg:hidden" />
        <div className="flex items-start gap-4">
          <Bone className="size-20 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2 pt-1">
            <Bone className="h-7 w-48 max-w-full" />
            <Bone className="h-4 w-28" />
            <Bone className="h-4 w-full max-w-md" />
            <Bone className="h-4 w-2/3 max-w-sm" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Bone className="h-28" />
          <Bone className="h-28" />
        </div>
        <div className="space-y-3">
          <Bone className="h-6 w-28" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Bone className="h-40" />
            <Bone className="h-40" />
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailWithSidebarShape() {
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <aside className="hidden space-y-4 lg:order-2 lg:block">
        <Bone className="h-36" />
        <Bone className="h-44" />
      </aside>
      <div className="min-w-0 space-y-4">
        <Bone className="h-16 lg:hidden" />
        <Bone className="aspect-[4/3] w-full" />
        <Bone className="h-8 w-40" />
        <Bone className="h-4 w-56" />
        <Bone className="h-4 w-full max-w-lg" />
        <Bone className="h-4 w-4/5 max-w-md" />
      </div>
    </div>
  );
}

function EditorShape() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Bone className="h-8 w-48" />
      <Bone className="h-4 w-72 max-w-full" />
      <Bone className="aspect-[4/3] w-full" />
      <Bone className="h-10 w-full" />
      <Bone className="h-10 w-full" />
      <Bone className="h-28 w-full" />
      <Bone className="h-10 w-28" />
    </div>
  );
}

function ListShape() {
  return (
    <div className="space-y-3">
      <Bone className="h-24" />
      <Bone className="h-24" />
      <Bone className="h-24" />
    </div>
  );
}

/**
 * Pulse layout shown while a data-heavy page is still fetching, so visitors
 * don't see an empty column or a one-line "Loading…" message.
 */
export function DataPageSkeleton({ label, variant, embedded = false }: DataPageSkeletonProps) {
  const shape =
    variant === "profile" ? (
      <ProfileShape />
    ) : variant === "detail-with-sidebar" ? (
      <DetailWithSidebarShape />
    ) : variant === "editor" ? (
      <EditorShape />
    ) : (
      <ListShape />
    );

  return (
    <div
      className={cn(!embedded && "mx-auto w-full max-w-5xl px-4 py-8")}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <span className="sr-only">{label}</span>
      {shape}
    </div>
  );
}
