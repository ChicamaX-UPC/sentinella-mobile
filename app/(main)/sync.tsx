import { ScrollView, StyleSheet } from "react-native";

import { MobileShell } from "@/components/MobileShell";
import { SyncPanel } from "@/components/SyncPanel";
import { spacing } from "@/theme/colors";

export default function SyncScreen() {
  return (
    <MobileShell title="Sincronización">
      <ScrollView contentContainerStyle={styles.content}>
        <SyncPanel />
      </ScrollView>
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.xl },
});
