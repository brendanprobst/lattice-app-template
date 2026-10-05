/** Initials fallback when an avatar URL is missing. */
export function displayInitials(name: string | null | undefined): string {
  const trimmed = name?.trim() ?? "";
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "");
  return letters.join("") || "?";
}
