import { type PluginSurfaceProps, useSettings, useTranslation } from "@getpaseo/plugin/client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Switch, Text, TextInput, View, type GestureResponderEvent, type StyleProp, type ViewStyle } from "react-native";
import { btwSettingsDefinition, colorModeSchema, type ColorMode, ZOOM_MAX, ZOOM_MIN, ZOOM_STEP } from "../shared/settings";
import { messages } from "./messages";
import { MarkdownView } from "./markdown";
import { clampZoom, formatZoom, scaleTextStyles, snapZoom } from "./typography";

const COLOR_MODES: readonly ColorMode[] = ["default", "accent", "muted", "success", "warning", "danger"];

export function BtwSettingsScreen({ theme, layout }: PluginSurfaceProps) {
  const settings = useSettings(btwSettingsDefinition);
  const { t } = useTranslation(messages);
  const [idleText, setIdleText] = useState<string | null>(null);
  const [contextText, setContextText] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [zoomText, setZoomText] = useState("1.0");
  const [zoomEditing, setZoomEditing] = useState(false);
  const [zoomLocalDirty, setZoomLocalDirty] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const values = settings.status === "ready" ? settings.values : null;
  const ready = settings.status === "ready";
  const previewMarkdown = t("settings.previewMarkdown");

  useEffect(() => {
    if (ready && values) {
      setIdleText((current) => current ?? String(values.idleMinutes));
      setContextText((current) => current ?? String(values.contextMessages));
    }
  }, [ready, values]);

  useEffect(() => {
    if (ready && values && !zoomEditing && (!zoomLocalDirty || values.zoom === zoom)) {
      setZoom(values.zoom);
      setZoomText(formatZoom(values.zoom));
      setZoomLocalDirty(false);
    }
  }, [ready, values?.zoom, zoom, zoomEditing, zoomLocalDirty]);

  const styles = useMemo(
    () => scaleTextStyles({
      screen: {
        flex: 1,
        backgroundColor: theme.colors.surface0,
        padding: layout.compact ? 12 : 20,
        gap: 12,
      },
      error: { color: theme.colors.statusDanger, fontSize: layout.compact ? 12 : 13 },
      previewLabel: { color: theme.colors.foregroundMuted, fontSize: layout.compact ? 11 : 12, marginBottom: 4 },
      zoomLabel: { color: theme.colors.foreground, fontSize: layout.compact ? 13 : 14, fontWeight: "700" as const },
      zoomHint: { color: theme.colors.foregroundMuted, fontSize: layout.compact ? 11 : 12 },
      section: { gap: 8 },
      sectionTitle: { color: theme.colors.foreground, fontSize: layout.compact ? 15 : 16, fontWeight: "700" as const },
      sectionInfo: { color: theme.colors.foregroundMuted, fontSize: layout.compact ? 11 : 12 },
      settingGroup: { gap: 4 },
      settingLabel: { color: theme.colors.foreground, fontSize: layout.compact ? 12 : 13, fontWeight: "600" as const },
      settingHint: { color: theme.colors.foregroundMuted, fontSize: layout.compact ? 10 : 11 },
      colorChoices: { flexDirection: "row" as const, alignItems: "center" as const, gap: 6, paddingVertical: 2 },
      colorOption: { borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 10, paddingVertical: 6 },
      colorOptionSelected: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
      colorOptionText: { color: theme.colors.foregroundMuted, fontSize: layout.compact ? 10 : 11 },
      colorOptionTextSelected: { color: theme.colors.accentForeground, fontWeight: "700" as const },
      settingSwitchRow: { flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "flex-end" as const },
      settingInput: {
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface1,
        color: theme.colors.foreground,
        paddingHorizontal: 10,
        paddingVertical: 8,
        fontSize: layout.compact ? 12 : 13,
      },
      preview: {
        borderRadius: 10,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface0,
        padding: layout.compact ? 10 : 14,
      },
      zoomControls: { flexDirection: "row" as const, alignItems: "center" as const, gap: 12 },
      zoomSlider: { flex: 1, height: 32, justifyContent: "center" as const },
      zoomTrack: { height: 6, borderRadius: 3, backgroundColor: theme.colors.border },
      zoomTrackFill: { position: "absolute" as const, left: 0, height: 6, borderRadius: 3, backgroundColor: theme.colors.accent },
      zoomThumb: { position: "absolute" as const, width: 18, height: 18, marginLeft: -9, borderRadius: 9, borderWidth: 2, borderColor: theme.colors.accent, backgroundColor: theme.colors.surface0 },
      zoomInput: {
        width: 72,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface1,
        color: theme.colors.foreground,
        paddingHorizontal: 8,
        paddingVertical: 6,
        textAlign: "center" as const,
        fontSize: layout.compact ? 13 : 14,
      },
    }, zoom),
    [theme, layout.compact, zoom],
  );

  const save = (patch: Partial<Record<"autoArchive" | "idleMinutes" | "contextMessages" | "attachToMain" | "headingColor" | "boldColor" | "highlightColor" | "zoom", unknown>>) => {
    if (!ready || !values) return Promise.resolve(false);
    return settings.save({ ...values, ...patch } as typeof values, settings.revision);
  };

  const updateZoomDraft = (value: number, syncText = true) => {
    const next = clampZoom(value);
    setZoom(next);
    if (syncText) setZoomText(formatZoom(next));
    setZoomLocalDirty(true);
  };

  const commitZoom = async (value: number) => {
    const next = clampZoom(value);
    setZoom(next);
    setZoomText(formatZoom(next));
    if (!ready || !values || values.zoom === next) {
      setZoomLocalDirty(false);
      return;
    }
    await save({ zoom: next });
  };

  const commitZoomText = (text: string) => {
    setZoomEditing(false);
    if (text.trim() === "" || !Number.isFinite(Number(text))) {
      const current = values?.zoom ?? 1;
      setZoom(current);
      setZoomText(formatZoom(current));
      setZoomLocalDirty(false);
      return;
    }
    void commitZoom(Number(text));
  };

  const scheduleIntSave = (field: "idleMinutes" | "contextMessages", text: string, max: number) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const parsed = Number.parseInt(text, 10);
    if (!Number.isFinite(parsed)) return;
    const clamped = Math.min(max, Math.max(1, parsed));
    saveTimer.current = setTimeout(() => save({ [field]: clamped }), 600);
  };

  const colorSelect = (label: string, field: "headingColor" | "boldColor" | "highlightColor") => (
    <View style={styles.settingGroup} accessibilityRole="radiogroup" accessibilityLabel={label}>
      <Text style={styles.settingLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorChoices}>
        {COLOR_MODES.map((mode) => {
          const selected = (values?.[field] ?? "default") === mode;
          return (
            <Pressable
              key={mode}
              accessibilityRole="radio"
              accessibilityLabel={`${label}: ${t(`settings.colorModes.${mode}`)}`}
              accessibilityState={{ selected, disabled: !ready }}
              disabled={!ready}
              onPress={() => save({ [field]: mode })}
              style={[styles.colorOption, selected && styles.colorOptionSelected]}
            >
              <Text style={[styles.colorOptionText, selected && styles.colorOptionTextSelected]}>
                {t(`settings.colorModes.${mode}`)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.screen}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("settings.appearanceSection")}</Text>
        <Text style={styles.sectionInfo}>{t("settings.appearanceInfo")}</Text>
        {colorSelect(t("settings.headingColor"), "headingColor")}
        {colorSelect(t("settings.boldColor"), "boldColor")}
        {colorSelect(t("settings.highlightColor"), "highlightColor")}
        <View style={{ gap: 6 }}>
          <Text style={styles.zoomLabel}>{t("settings.zoomLabel")}</Text>
          <Text style={styles.zoomHint}>{t("settings.zoomHint")}</Text>
          <View style={styles.zoomControls}>
            <ZoomSlider
              label={t("settings.zoomLabel")}
              incrementLabel={t("settings.zoomIncrease")}
              decrementLabel={t("settings.zoomDecrease")}
              value={zoom}
              styles={styles}
              disabled={!ready}
              onChange={updateZoomDraft}
              onCommit={(value) => void commitZoom(value)}
            />
            <TextInput
              accessibilityLabel={t("settings.zoomLabel")}
              value={zoomText}
              onFocus={() => setZoomEditing(true)}
              onChangeText={(text) => {
                setZoomText(text);
                const parsed = Number(text);
                if (text.trim() !== "" && Number.isFinite(parsed)) updateZoomDraft(parsed, false);
              }}
              onEndEditing={(event) => commitZoomText(event.nativeEvent.text)}
              keyboardType="decimal-pad"
              returnKeyType="done"
              editable={ready}
              selectTextOnFocus
              style={styles.zoomInput}
            />
          </View>
        </View>
        <View>
          <Text style={styles.previewLabel}>{t("settings.preview")}</Text>
          <View style={styles.preview}>
            <MarkdownView markdown={previewMarkdown} theme={theme} compact={layout.compact} />
          </View>
        </View>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("settings.lifecycleSection")}</Text>
        <Text style={styles.sectionInfo}>{t("settings.lifecycleInfo")}</Text>
        <View style={styles.settingGroup}>
          <Text style={styles.settingLabel}>{t("settings.attachSwitch")}</Text>
          <Text style={styles.settingHint}>{t("settings.attachHint")}</Text>
          <View style={styles.settingSwitchRow}>
            <Switch
              accessibilityLabel={t("settings.attachSwitch")}
              value={values?.attachToMain ?? true}
              onValueChange={(value) => {
                void save({ attachToMain: value });
              }}
              disabled={!ready}
              trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
              thumbColor={theme.colors.surface0}
            />
          </View>
        </View>
        <View style={styles.settingGroup}>
          <Text style={styles.settingLabel}>{t("settings.autoArchiveSwitch")}</Text>
          <Text style={styles.settingHint}>{t("settings.autoArchiveHint")}</Text>
          <View style={styles.settingSwitchRow}>
            <Switch
              accessibilityLabel={t("settings.autoArchiveSwitch")}
              value={values?.autoArchive ?? false}
              onValueChange={(value) => {
                void save({ autoArchive: value });
              }}
              disabled={!ready}
              trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
              thumbColor={theme.colors.surface0}
            />
          </View>
        </View>
        <View style={styles.settingGroup}>
          <Text style={styles.settingLabel}>{t("settings.idleMinutesLabel")}</Text>
          <Text style={styles.settingHint}>{t("settings.idleMinutesHint")}</Text>
          <TextInput
            accessibilityLabel={t("settings.idleMinutesLabel")}
            value={idleText ?? ""}
            onChangeText={(text) => {
              setIdleText(text);
              scheduleIntSave("idleMinutes", text, 1440);
            }}
            editable={ready && (values?.autoArchive ?? false)}
            keyboardType="number-pad"
            style={styles.settingInput}
          />
        </View>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("settings.contextSection")}</Text>
        <Text style={styles.sectionInfo}>{t("settings.contextInfo")}</Text>
        <View style={styles.settingGroup}>
          <Text style={styles.settingLabel}>{t("settings.contextMessagesLabel")}</Text>
          <Text style={styles.settingHint}>{t("settings.contextMessagesHint", { range: "1 - 50" })}</Text>
          <TextInput
            accessibilityLabel={t("settings.contextMessagesLabel")}
            value={contextText ?? ""}
            onChangeText={(text) => {
              setContextText(text);
              scheduleIntSave("contextMessages", text, 50);
            }}
            editable={ready}
            keyboardType="number-pad"
            style={styles.settingInput}
          />
        </View>
      </View>
      {settings.saveError ? <Text style={styles.error}>{settings.saveError}</Text> : null}
    </View>
  );
}

function ZoomSlider({
  label,
  incrementLabel,
  decrementLabel,
  value,
  styles,
  disabled,
  onChange,
  onCommit,
}: {
  label: string;
  incrementLabel: string;
  decrementLabel: string;
  value: number;
  styles: {
    zoomSlider: StyleProp<ViewStyle>;
    zoomTrack: StyleProp<ViewStyle>;
    zoomTrackFill: StyleProp<ViewStyle>;
    zoomThumb: StyleProp<ViewStyle>;
  };
  disabled: boolean;
  onChange: (value: number) => void;
  onCommit: (value: number) => void;
}) {
  const [width, setWidth] = useState(1);
  const progress = ((value - ZOOM_MIN) / (ZOOM_MAX - ZOOM_MIN)) * 100;
  const updateFromEvent = (event: GestureResponderEvent, commit = false) => {
    if (disabled) return;
    const ratio = Math.max(0, Math.min(1, event.nativeEvent.locationX / Math.max(width, 1)));
    const next = snapZoom(ZOOM_MIN + ratio * (ZOOM_MAX - ZOOM_MIN));
    onChange(next);
    if (commit) onCommit(next);
  };
  const onAccessibilityAction = (event: { nativeEvent: { actionName: string } }) => {
    if (disabled) return;
    const direction = event.nativeEvent.actionName === "increment" ? 1 : -1;
    const next = snapZoom(value + direction * ZOOM_STEP);
    onChange(next);
    onCommit(next);
  };

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min: ZOOM_MIN, max: ZOOM_MAX, now: value, text: formatZoom(value) }}
      accessibilityActions={[{ name: "increment", label: incrementLabel }, { name: "decrement", label: decrementLabel }]}
      accessibilityState={{ disabled }}
      onAccessibilityAction={onAccessibilityAction}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => !disabled}
      onMoveShouldSetResponder={() => !disabled}
      onResponderGrant={(event) => updateFromEvent(event)}
      onResponderMove={(event) => updateFromEvent(event)}
      onResponderRelease={(event) => updateFromEvent(event, true)}
      style={[styles.zoomSlider, disabled ? { opacity: 0.5 } : null]}
    >
      <View pointerEvents="none" style={styles.zoomTrack} />
      <View pointerEvents="none" style={[styles.zoomTrackFill, { width: `${progress}%` }]} />
      <View pointerEvents="none" style={[styles.zoomThumb, { left: `${progress}%` }]} />
    </View>
  );
}
