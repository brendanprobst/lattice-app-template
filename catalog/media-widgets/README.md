# media-widgets

Client image helpers harvested from Fosterfolio (dropzone, reorderable list, segmented toggle, MIME filter + downscale). **`npm run scaffold` does not copy catalog.** Apply this pack only when a spawn needs photo upload UI.

## How to apply

1. Copy everything under `files/` into the spawn (or template) at the same repo-relative paths.
2. Keep Fosterfolio product names out of the spawn: these files already use `ImageDropzone` / `ImageList` / `Photos` / `Cover`. Wire `onFiles` / `onDelete` / `onMove` to your domain; pass `maxFiles` if you have a cap.
3. Imports use `@client/`. The dropzone and list need `"use client"`.
4. No extra npm packages. Relies on existing `Button`, `cn`, and `lucide-react`.

## Files

| Catalog path | Spawn destination |
|--------------|-------------------|
| `files/apps/web/client/components/media/ImageDropzone.tsx` | `apps/web/client/components/media/ImageDropzone.tsx` |
| `files/apps/web/client/components/media/ImageList.tsx` | `apps/web/client/components/media/ImageList.tsx` |
| `files/apps/web/client/components/media/SegmentedToggle.tsx` | `apps/web/client/components/media/SegmentedToggle.tsx` |
| `files/apps/web/client/components/media/index.ts` | `apps/web/client/components/media/index.ts` |
| `files/apps/web/client/lib/media/isAllowedImageFile.ts` | `apps/web/client/lib/media/isAllowedImageFile.ts` |
| `files/apps/web/client/lib/media/downscaleImage.ts` | `apps/web/client/lib/media/downscaleImage.ts` |

## API notes

- **`ImageDropzone`**: `pending`, `onFiles(files: File[])`, optional `maxFiles`, `label`, `disabled`. Drag-drop, file picker, clipboard paste; MIME filter via `isAllowedImageFile`.
- **`ImageList`**: `photos: { url: string }[]`, `pending`, `onDelete`, `onMove`. Neutral labels: Photos / Cover / Move up.
- **`SegmentedToggle`**: labeled radiogroup for cover vs gallery (or any string options).
- **`downscaleImage`**: long-edge 2048; GIFs pass through.
