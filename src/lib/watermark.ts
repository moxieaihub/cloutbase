/**
 * Client-side watermark tooling for in-house clips.
 *
 * Real video encoding cannot happen in the browser or on the edge runtime, so we
 * do two things that ARE reliable:
 *  1. build a ready-to-drop 1080x1920 transparent overlay PNG with the Cloutbase
 *     watermark already positioned and sized to spec, and
 *  2. burn the watermark onto any still (cover frame / screenshot) the clipper
 *     uploads, so placement can be checked before posting.
 */

export const OVERLAY_WIDTH = 1080;
export const OVERLAY_HEIGHT = 1920;
/** Watermark occupies this share of the video width. */
export const WATERMARK_WIDTH_RATIO = 0.28;
/** Margin from the safe edge, as a share of the video width. */
export const WATERMARK_MARGIN_RATIO = 0.05;
export const WATERMARK_OPACITY = 0.9;

export const WATERMARK_PLACEMENT =
  "Bottom-right, 28% of the video width, 5% margin, 90% opacity — visible for the whole clip.";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load the watermark image."));
    img.src = src;
  });
}

function draw(
  ctx: CanvasRenderingContext2D,
  mark: HTMLImageElement,
  width: number,
  height: number,
) {
  const markWidth = width * WATERMARK_WIDTH_RATIO;
  const markHeight = markWidth * (mark.height / mark.width || 1);
  const margin = width * WATERMARK_MARGIN_RATIO;
  ctx.globalAlpha = WATERMARK_OPACITY;
  ctx.drawImage(mark, width - markWidth - margin, height - markHeight - margin, markWidth, markHeight);
  ctx.globalAlpha = 1;
}

async function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
  if (!blob) throw new Error("Could not render the watermark.");
  return blob;
}

/** Transparent overlay sized for a 9:16 clip, watermark already placed. */
export async function buildOverlayPng(watermarkUrl: string): Promise<Blob> {
  const mark = await loadImage(watermarkUrl);
  const canvas = document.createElement("canvas");
  canvas.width = OVERLAY_WIDTH;
  canvas.height = OVERLAY_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available in this browser.");
  draw(ctx, mark, OVERLAY_WIDTH, OVERLAY_HEIGHT);
  return toBlob(canvas);
}

/** Burn the watermark onto a still the clipper uploads. */
export async function applyToImage(file: File, watermarkUrl: string): Promise<Blob> {
  const [base, mark] = await Promise.all([
    loadImage(URL.createObjectURL(file)),
    loadImage(watermarkUrl),
  ]);
  const canvas = document.createElement("canvas");
  canvas.width = base.width;
  canvas.height = base.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available in this browser.");
  ctx.drawImage(base, 0, 0);
  draw(ctx, mark, base.width, base.height);
  return toBlob(canvas);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function watermarkStateLabel(verified: boolean | null): {
  label: string;
  tone: "pending" | "ok" | "bad";
} {
  if (verified === true) return { label: "Watermark verified", tone: "ok" };
  if (verified === false) return { label: "Watermark rejected — earns nothing", tone: "bad" };
  return { label: "Watermark awaiting review", tone: "pending" };
}
