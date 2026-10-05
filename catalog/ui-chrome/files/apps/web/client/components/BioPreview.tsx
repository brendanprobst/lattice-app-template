"use client";

import { Markdown } from "@client/components/markdown";
import { Button } from "@client/components/ui/button";
import {
  BIO_PREVIEW_MAX_LINES,
  bioExceedsPreview,
} from "@client/lib/bioPreview";
import { cn } from "@client/lib/utils";
import { useLayoutEffect, useRef, useState } from "react";

type BioPreviewProps = {
  bio: string;
  markdownClassName?: string;
  maxLines?: number;
  onReadMore: () => void;
};

/**
 * Clamped bio with Read more. Truncates on character cap, source line cap, or
 * visual overflow past `maxLines` (default 5).
 */
export function BioPreview({
  bio,
  markdownClassName,
  maxLines = BIO_PREVIEW_MAX_LINES,
  onReadMore,
}: BioPreviewProps) {
  const clampRef = useRef<HTMLDivElement>(null);
  const [overflows, setOverflows] = useState(false);

  useLayoutEffect(() => {
    const el = clampRef.current;
    if (!el) {
      return;
    }
    const check = () => {
      setOverflows(el.scrollHeight > el.clientHeight + 1);
    };
    check();
    if (typeof ResizeObserver === "undefined") {
      return;
    }
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [bio, maxLines]);

  const truncated = bioExceedsPreview(bio, { maxLines }) || overflows;

  return (
    <div className="space-y-1">
      <div
        ref={clampRef}
        className={maxLines === BIO_PREVIEW_MAX_LINES ? "line-clamp-5" : undefined}
        style={
          maxLines === BIO_PREVIEW_MAX_LINES
            ? undefined
            : {
                display: "-webkit-box",
                overflow: "hidden",
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: maxLines,
              }
        }
      >
        <Markdown className={cn(markdownClassName)}>{bio}</Markdown>
      </div>
      {truncated ? (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto px-0"
          onClick={onReadMore}
        >
          Read more...
        </Button>
      ) : null}
    </div>
  );
}
