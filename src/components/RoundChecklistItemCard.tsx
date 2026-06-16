import type { ChecklistItem } from "@/api/types";
import { ChecklistItemPhoto } from "@/components/ChecklistItemPhoto";
import { formatWhen } from "@/components/DetailFields";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { useTheme } from "@/theme/ThemeContext";
import { spacing } from "@/theme/tokens";

type Props = {
  roundId: string;
  item: ChecklistItem;
  showAction?: boolean;
};

export function RoundChecklistItemCard({ roundId, item, showAction = true }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const done = Boolean(item.completedAt);

  return (
    <View style={styles.card}>
      <Text style={styles.point}>
        {item.pointName}
        {item.required !== false ? " *" : ""}
      </Text>

      {done ? (
        <>
          <Text style={styles.done}>
            Listo · {formatWhen(item.completedAt)}
            {item.anomaly ? " · Anomalía" : ""}
          </Text>
          {item.observations ? <Text style={styles.obs}>{item.observations}</Text> : null}
          {item.latitude != null && item.longitude != null ? (
            <Text style={styles.coords}>
              GPS: {Number(item.latitude).toFixed(5)}, {Number(item.longitude).toFixed(5)}
            </Text>
          ) : null}
          <ChecklistItemPhoto
            roundId={roundId}
            itemId={item.id}
            photoS3Key={item.photoS3Key}
          />
        </>
      ) : showAction ? (
        <Pressable
          onPress={() => router.push(`/(main)/rounds/${roundId}/item/${item.id}`)}
        >
          <Text style={styles.link}>Completar ítem →</Text>
        </Pressable>
      ) : (
        <Text style={styles.pending}>Pendiente</Text>
      )}
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    card: {
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      gap: 2,
    },
    point: { color: colors.text, fontSize: 16, fontWeight: "600" },
    done: { color: colors.success, fontSize: 12, marginTop: spacing.xs },
    obs: { color: colors.muted, fontSize: 13, marginTop: 2 },
    coords: { color: colors.dim, fontSize: 12 },
    link: { color: colors.accent, marginTop: spacing.sm, fontWeight: "600" },
    pending: { color: colors.dim, fontSize: 12, marginTop: spacing.sm },
  });
}
