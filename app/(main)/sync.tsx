import { StyleSheet } from "react-native";

import { AppScrollView } from "@/components/AppScrollView";
import { MobileShell } from "@/components/MobileShell";
import { SyncPanel } from "@/components/SyncPanel";
import { spacing } from "@/theme/tokens";

export default function SyncScreen() {
  return (
    <MobileShell title="Sincronización">
      <AppScrollView contentContainerStyle={styles.content}>
        <SyncPanel />
      </AppScrollView>
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.xl },
});
