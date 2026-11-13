import { defineSettings } from "@getpaseo/plugin";
import { z } from "zod";

export const colorModeSchema = z.enum(["default", "accent", "muted", "success", "warning", "danger"]);
export type ColorMode = z.infer<typeof colorModeSchema>;

export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 2;
export const ZOOM_STEP = 0.25;

export const btwSettingsDefinition = defineSettings({
  id: "btw-settings",
  scope: "host",
  version: 9,
  schema: z.object({
    autoArchive: z.boolean().default(false),
    idleMinutes: z.number().int().min(1).max(1440).default(10),
    contextMessages: z.number().int().min(1).max(50).default(8),
    attachToMain: z.boolean().default(true),
    headingColor: colorModeSchema.default("default"),
    boldColor: colorModeSchema.default("default"),
    highlightColor: colorModeSchema.default("default"),
    highlightBgColor: colorModeSchema.default("accent"),
    zoom: z.number().min(ZOOM_MIN).max(ZOOM_MAX).multipleOf(ZOOM_STEP).default(1),
  }),
  // v7 dropped the plugin-managed language override; v8 added text zoom; v9 snaps old tenths to quarter steps.
  migrate: (values) => {
    if (typeof values === "object" && values !== null && !Array.isArray(values)) {
      const { language: _dropped, ...rest } = values as Record<string, unknown>;
      if (typeof rest.zoom === "number" && Number.isFinite(rest.zoom)) {
        const snapped = Math.round(rest.zoom / ZOOM_STEP) * ZOOM_STEP;
        rest.zoom = Number(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, snapped)).toFixed(2));
      }
      return rest;
    }
    return values;
  },
});

export type BtwSettings = z.infer<typeof btwSettingsDefinition.schema>;
