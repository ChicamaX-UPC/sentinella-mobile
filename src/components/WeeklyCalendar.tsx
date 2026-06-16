import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  addWeeks,
  formatMonthYear,
  isSameDay,
  isToday,
  shortDayLabel,
  startOfWeekSunday,
  weekDays,
} from "@/lib/calendar";
import { useTheme } from "@/theme/ThemeContext";
import { fonts } from "@/theme/typography";
import { radii, spacing } from "@/theme/tokens";

type Props = {
  selected: Date;
  onSelect: (day: Date) => void;
};

export function WeeklyCalendar({ selected, onSelect }: Props) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const [weekAnchor, setWeekAnchor] = useState(() => startOfWeekSunday(selected));

  const days = useMemo(() => weekDays(weekAnchor), [weekAnchor]);
  const monthLabel = formatMonthYear(selected);

  function shiftWeek(delta: number) {
    setWeekAnchor((w) => addWeeks(w, delta));
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Pressable
          onPress={() => shiftWeek(-1)}
          style={styles.navBtn}
          accessibilityLabel="Semana anterior"
        >
          <Ionicons name="chevron-back" size={18} color={colors.text} />
        </Pressable>
        <Text style={styles.month}>{monthLabel}</Text>
        <Pressable
          onPress={() => shiftWeek(1)}
          style={styles.navBtn}
          accessibilityLabel="Semana siguiente"
        >
          <Ionicons name="chevron-forward" size={18} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.grid}>
        {days.map((day) => {
          const active = isSameDay(day, selected);
          const today = isToday(day);
          return (
            <Pressable
              key={day.toISOString()}
              onPress={() => onSelect(day)}
              style={styles.cell}
            >
              <Text style={[styles.dow, active && styles.dowActive]}>
                {shortDayLabel(day)}
              </Text>
              <View style={[styles.dateBubble, active && styles.dateBubbleActive]}>
                <Text
                  style={[
                    styles.dateNum,
                    active && styles.dateNumActive,
                    today && !active && styles.dateToday,
                  ]}
                >
                  {day.getDate()}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>["colors"], isDark: boolean) {
  const selectionBg = isDark ? "rgba(255, 140, 66, 0.22)" : "#e8eef8";

  return StyleSheet.create({
    wrap: {
      marginBottom: spacing.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      borderRadius: radii.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: isDark ? colors.surfaceAlt : "#f7f9fc",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: spacing.md,
      paddingHorizontal: spacing.xs,
    },
    navBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? colors.bg : "#ffffff",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    month: {
      fontFamily: fonts.displaySemi,
      fontSize: 16,
      color: colors.text,
      letterSpacing: -0.2,
    },
    grid: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    cell: {
      flex: 1,
      alignItems: "center",
      gap: 6,
    },
    dow: {
      fontFamily: fonts.body,
      fontSize: 11,
      color: colors.dim,
    },
    dowActive: {
      color: colors.text,
      fontFamily: fonts.bodyMedium,
    },
    dateBubble: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    dateBubbleActive: {
      backgroundColor: selectionBg,
    },
    dateNum: {
      fontFamily: fonts.displaySemi,
      fontSize: 15,
      color: colors.muted,
    },
    dateNumActive: {
      color: colors.text,
    },
    dateToday: {
      color: colors.accent,
    },
  });
}
