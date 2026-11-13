import { ZOOM_MAX, ZOOM_MIN, ZOOM_STEP } from "../shared/settings";

export function normalizeZoom(value: number): number {
  const snapped = Math.round(value / ZOOM_STEP) * ZOOM_STEP;
  return Number(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, snapped)).toFixed(2));
}

export function formatZoom(value: number): string {
  return String(normalizeZoom(value));
}

/** Scale every explicit font size and line height in a component's style map. */
export function scaleTextStyles<T extends Record<string, unknown>>(styles: T, zoom: number): T {
  const scaled: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(styles)) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      scaled[name] = value;
      continue;
    }
    const style = value as Record<string, unknown>;
    scaled[name] = {
      ...style,
      ...(typeof style.fontSize === "number" ? { fontSize: style.fontSize * zoom } : {}),
      ...(typeof style.lineHeight === "number" ? { lineHeight: style.lineHeight * zoom } : {}),
    };
  }
  return scaled as T;
}
