"use client";

import { Button } from "@client/components/ui/button";
import { isAllowedImageFile } from "@client/lib/media/isAllowedImageFile";
import { cn } from "@client/lib/utils";
import { ClipboardPaste, ImagePlus } from "lucide-react";
import { DragEvent, useId, useRef, useState } from "react";

type ImageDropzoneProps = {
  maxFiles?: number;
  label?: string;
  pending: boolean;
  disabled?: boolean;
  onFiles: (files: File[]) => void | Promise<void>;
};

async function imageFileFromClipboard(): Promise<File | null> {
  if (!navigator.clipboard?.read) {
    throw new Error("This browser cannot read the clipboard.");
  }
  const items = await navigator.clipboard.read();
  for (const item of items) {
    const type = item.types.find((candidate) => candidate.startsWith("image/"));
    if (!type) continue;
    const blob = await item.getType(type);
    const file =
      blob instanceof File
        ? blob
        : new File([blob], `clipboard.${type.split("/")[1] ?? "png"}`, { type });
    return file;
  }
  return null;
}

export function ImageDropzone({
  maxFiles,
  label = "Photos",
  pending,
  disabled = false,
  onFiles,
}: ImageDropzoneProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const blocked = pending || disabled;

  async function accept(files: File[]) {
    setLocalError(null);
    if (files.length === 0) return;
    const allowed = files.filter(isAllowedImageFile);
    if (allowed.length !== files.length) {
      setLocalError("Only JPEG, PNG, WebP, and GIF images are supported.");
    }
    if (allowed.length === 0) return;
    await onFiles(allowed);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragOver(false);
    void accept(Array.from(event.dataTransfer.files ?? []));
  }

  const hint = pending
    ? "Uploading…"
    : maxFiles != null
      ? `Drop photos here, or click browse. Up to ${maxFiles}. You can also paste from the clipboard.`
      : "Drop photos here, or click browse. You can also paste from the clipboard.";

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <div
        role="group"
        aria-label="Photo drop area"
        onDragOver={(event) => {
          event.preventDefault();
          if (blocked) return;
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          if (blocked) {
            event.preventDefault();
            return;
          }
          onDrop(event);
        }}
        className={cn(
          "border-border bg-muted/30 flex min-h-36 flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-4 py-6 text-center transition-colors",
          dragOver && "border-primary bg-primary/5",
          disabled && "opacity-60",
        )}
      >
        <ImagePlus className="text-muted-foreground size-8" aria-hidden />
        <p className="text-muted-foreground max-w-sm text-sm">{hint}</p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={blocked}
            onClick={() => inputRef.current?.click()}
          >
            Browse files
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={blocked}
            onClick={() => {
              void (async () => {
                try {
                  const file = await imageFileFromClipboard();
                  if (!file) {
                    setLocalError("No image on the clipboard.");
                    return;
                  }
                  await accept([file]);
                } catch (error) {
                  setLocalError(
                    error instanceof Error
                      ? error.message
                      : "Could not read the clipboard.",
                  );
                }
              })();
            }}
          >
            <ClipboardPaste aria-hidden />
            Upload from clipboard
          </Button>
        </div>
        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="sr-only"
          onChange={(event) => {
            void accept(Array.from(event.target.files ?? []));
            event.target.value = "";
          }}
        />
      </div>
      {localError ? <p className="text-destructive text-sm">{localError}</p> : null}
    </div>
  );
}
