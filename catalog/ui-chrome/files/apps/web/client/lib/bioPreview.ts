/** Character cutoff for a bio preview; longer copy shows Read more. */
export const BIO_PREVIEW_MAX_CHARS = 280;

/** Line cutoff for a bio preview; more than this many source lines shows Read more. */
export const BIO_PREVIEW_MAX_LINES = 5;

/**
 * Whether a bio should be clamped behind Read more.
 * Visual wrap beyond `maxLines` is detected separately in `BioPreview`.
 */
export function bioExceedsPreview(
  bio: string,
  options?: { maxChars?: number; maxLines?: number },
): boolean {
  const maxChars = options?.maxChars ?? BIO_PREVIEW_MAX_CHARS;
  const maxLines = options?.maxLines ?? BIO_PREVIEW_MAX_LINES;
  if (bio.length > maxChars) {
    return true;
  }
  const lineCount = bio.replace(/\n+$/u, "").split("\n").length;
  return lineCount > maxLines;
}
