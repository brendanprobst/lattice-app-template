/** MIME types accepted by `downscaleImage` / image upload. */
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export function isAllowedImageFile(file: { type: string } | null | undefined): boolean {
  return Boolean(file && (ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type));
}
