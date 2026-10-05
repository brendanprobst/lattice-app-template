const MAX_LONG_EDGE = 2048;
const JPEG_QUALITY = 0.8;

export type DownscaledImage = {
  blob: Blob;
  filename: string;
  contentType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
};

function extensionForType(type: DownscaledImage["contentType"]): string {
  switch (type) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "jpg";
  }
}

/**
 * Client-side downscale before upload.
 * GIFs are passed through (canvas would flatten animation).
 */
export async function downscaleImage(file: File): Promise<DownscaledImage> {
  const type = file.type as DownscaledImage["contentType"];
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
  if (!(allowed as readonly string[]).includes(type)) {
    throw new Error("Only JPEG, PNG, WebP, and GIF images are supported.");
  }

  if (type === "image/gif") {
    return {
      blob: file,
      filename: file.name || "image.gif",
      contentType: type,
    };
  }

  const bitmap = await createImageBitmap(file);
  try {
    const longEdge = Math.max(bitmap.width, bitmap.height);
    const scale = longEdge > MAX_LONG_EDGE ? MAX_LONG_EDGE / longEdge : 1;
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not prepare image for upload.");
    }
    ctx.drawImage(bitmap, 0, 0, width, height);

    const outputType: DownscaledImage["contentType"] =
      type === "image/png" || type === "image/webp" ? type : "image/jpeg";
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (!result) {
            reject(new Error("Could not compress image."));
            return;
          }
          resolve(result);
        },
        outputType,
        outputType === "image/jpeg" ? JPEG_QUALITY : undefined,
      );
    });

    const base =
      file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9._-]+/g, "_") ||
      "photo";
    return {
      blob,
      filename: `${base}.${extensionForType(outputType)}`,
      contentType: outputType,
    };
  } finally {
    bitmap.close();
  }
}
