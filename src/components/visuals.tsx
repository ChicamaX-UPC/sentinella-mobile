import { useMemo } from "react";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";

import { useTheme } from "@/theme/ThemeContext";
import { fonts } from "@/theme/typography";
import { spacing } from "@/theme/tokens";

type Tone = "neutral" | "accent" | "success" | "warning" | "danger";

function toneColor(colors: ReturnType<typeof useTheme>["colors"], tone: Tone) {
  if (tone === "accent") return colors.accent;
  if (tone === "success") return colors.success;
  if (tone === "warning") return colors.warning;
  if (tone === "danger") return colors.danger;
  return colors.muted;
}

type StatBlockProps = {
  value: string | number;
  label: string;
  tone?: Tone;
  style?: ViewStyle;
};

export function StatBlock({ value, label, tone = "neutral", style }: StatBlockProps) {
  const { colors, type } = useTheme();
  const bar = toneColor(colors, tone);

  return (
    <View style={[{ flex: 1, gap: 2, minWidth: 64 }, style]}>
      <Text style={[type.metric, { color: bar, fontSize: 22 }]}>{value}</Text>
      <Text style={type.caption}>{label}</Text>
    </View>
  );
}

type HealthMeterProps = {
  score: number;
  caption: string;
};

export function HealthMeter({ score, caption }: HealthMeterProps) {
  const { colors, type } = useTheme();
  const styles = useMemo(() => createHealthStyles(colors), [colors]);
  const clamped = Math.max(0, Math.min(100, score));
  const tone: Tone =
    clamped >= 80 ? "success" : clamped >= 55 ? "warning" : "danger";
  const fill = toneColor(colors, tone);

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={type.bodyMedium}>Salud del tranque</Text>
        <Text style={[type.metric, { color: fill, fontSize: 22 }]}>{clamped}%</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${clamped}%`, backgroundColor: fill }]} />
      </View>
      <Text style={type.caption}>{caption}</Text>
    </View>
  );
}

function createHealthStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    wrap: {
      gap: spacing.sm,
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      marginBottom: spacing.sm,
    },
    head: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
    track: {
      height: 3,
      backgroundColor: colors.border,
      overflow: "hidden",
    },
    fill: { height: "100%" },
  });
}

type DistributionProps = {
  ok: number;
  warn: number;
  crit: number;
  offline: number;
};

export function StatusDistribution({ ok, warn, crit, offline }: DistributionProps) {
  const { colors, type } = useTheme();
  const styles = useMemo(() => createDistStyles(colors), [colors]);
  const total = ok + warn + crit + offline || 1;

  const segments = [
    { key: "ok", value: ok, color: colors.success, label: "OK" },
    { key: "warn", value: warn, color: colors.warning, label: "Aviso" },
    { key: "crit", value: crit, color: colors.danger, label: "Crítico" },
    { key: "off", value: offline, color: colors.dim, label: "Off" },
  ].filter((s) => s.value > 0);

  return (
    <View style={styles.wrap}>
      <View style={styles.bar}>
        {segments.map((s) => (
          <View
            key={s.key}
            style={{ flex: s.value / total, backgroundColor: s.color, height: "100%" }}
          />
        ))}
      </View>
      <View style={styles.legend}>
        {segments.map((s) => (
          <Text key={s.key} style={type.caption}>
            {s.label} {s.value}
          </Text>
        ))}
      </View>
    </View>
  );
}

function createDistStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    wrap: {
      gap: spacing.sm,
      marginBottom: spacing.md,
      paddingBottom: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    bar: {
      flexDirection: "row",
      height: 4,
      overflow: "hidden",
      backgroundColor: colors.border,
    },
    legend: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  });
}

type SparklineProps = {
  values: number[];
  tone?: Tone;
  height?: number;
};

export function Sparkline({ values, tone = "accent", height = 28 }: SparklineProps) {
  const { colors } = useTheme();
  const color = toneColor(colors, tone);
  if (values.length === 0) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 1, height }}>
      {values.map((v, i) => {
        const h = Math.max(2, ((v - min) / span) * height);
        return (
          <View
            key={`${i}-${v}`}
            style={{
              flex: 1,
              height: h,
              backgroundColor: color,
              opacity: i === values.length - 1 ? 1 : 0.35,
            }}
          />
        );
      })}
    </View>
  );
}

export function StatusDot({ tone }: { tone: Tone }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: toneColor(colors, tone),
        marginTop: 6,
      }}
    />
  );
}

export function nodeStatusTone(status: string | undefined): Tone {
  const u = (status ?? "").toUpperCase();
  if (u.includes("OFFLINE") || u.includes("OFF")) return "neutral";
  if (u.includes("CRIT")) return "danger";
  if (u.includes("WARN") || u.includes("HIGH")) return "warning";
  if (u.includes("OK") || u.includes("NORMAL")) return "success";
  return "accent";
}
