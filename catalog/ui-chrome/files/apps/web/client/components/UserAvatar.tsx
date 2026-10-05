import { displayInitials } from "@client/lib/displayInitials";
import { cn } from "@client/lib/utils";

type UserAvatarProps = {
  name: string | null;
  url: string | null;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
};

const sizeClass = {
  sm: "size-8 text-xs",
  md: "size-12 text-sm",
  lg: "size-16 text-base",
  xl: "size-24 text-xl",
  "2xl": "size-32 text-2xl",
} as const;

export function UserAvatar({ name, url, size = "md", className }: UserAvatarProps) {
  const initials = displayInitials(name);
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- pasted avatar URLs, static export
      <img
        src={url}
        alt={name ?? "Avatar"}
        className={cn(
          "border-border bg-muted rounded-full border object-cover",
          sizeClass[size],
          className,
        )}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        "bg-muted text-muted-foreground inline-flex items-center justify-center rounded-full font-medium",
        sizeClass[size],
        className,
      )}
    >
      {initials}
    </span>
  );
}
