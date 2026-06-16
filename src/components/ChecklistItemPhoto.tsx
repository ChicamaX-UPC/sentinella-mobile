import { useEffect, useMemo, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageStyle,
  type StyleProp,
} from "react-native";

import { useSession } from "@/auth/SessionContext";
import { checklistPhotoApiUrl } from "@/lib/checklistPhotos";
import { getPhotoDraft } from "@/offline/photos";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing } from "@/theme/tokens";

type Props = {
  roundId: string;
  itemId: string;
  photoS3Key?: string | null;
  style?: StyleProp<ImageStyle>;
  label?: string;
};

export function ChecklistItemPhoto({
  roundId,
  itemId,
  photoS3Key,
  style,
  label = "Foto del punto",
}: Props) {
  const { token } = useSession();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    void getPhotoDraft(roundId, itemId).then((draft) => {
      if (active && draft?.uri) {
        setLocalUri(draft.uri);
        setFailed(false);
      }
    });
    return () => {
      active = false;
    };
  }, [roundId, itemId]);

  const hasRemote = Boolean(photoS3Key);
  const hasLocal = Boolean(localUri);

  const source = useMemo(() => {
    if (hasLocal) {
      return { uri: localUri! };
    }
    if (hasRemote && token) {
      return {
        uri: checklistPhotoApiUrl(roundId, itemId),
        headers: { Authorization: `Bearer ${token}` },
      };
    }
    return null;
  }, [hasLocal, hasRemote, itemId, localUri, roundId, token]);

  if (!hasLocal && !hasRemote) {
    return null;
  }

  if (!source) {
    return (
      <Text style={styles.muted}>Foto guardada · inicia sesión para verla</Text>
    );
  }

  return (
    <>
      <View style={styles.wrap}>
        <Text style={styles.label}>{label}</Text>
        <Pressable onPress={() => setExpanded(true)} accessibilityLabel="Ampliar foto">
          <Image
            source={source}
            style={[styles.thumb, style]}
            resizeMode="cover"
            onError={() => setFailed(true)}
          />
        </Pressable>
        {failed && !hasLocal ? (
          <Text style={styles.muted}>No se pudo cargar la foto del servidor</Text>
        ) : (
          <Text style={styles.hint}>Toca para ampliar</Text>
        )}
      </View>

      <Modal
        visible={expanded}
        transparent
        animationType="fade"
        onRequestClose={() => setExpanded(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setExpanded(false)}>
          <View style={styles.modalInner}>
            <Image source={source} style={styles.full} resizeMode="contain" />
            <Text style={styles.closeHint}>Toca fuera para cerrar</Text>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    wrap: {
      marginTop: spacing.sm,
      gap: spacing.xs,
    },
    label: {
      color: colors.muted,
      fontSize: 12,
    },
    thumb: {
      width: "100%",
      height: 160,
      borderRadius: radii.md,
      backgroundColor: colors.surfaceAlt,
    },
    hint: {
      color: colors.dim,
      fontSize: 11,
    },
    muted: {
      color: colors.dim,
      fontSize: 12,
    },
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.92)",
      justifyContent: "center",
      padding: spacing.md,
    },
    modalInner: {
      flex: 1,
      justifyContent: "center",
      gap: spacing.md,
    },
    full: {
      width: "100%",
      height: "80%",
    },
    closeHint: {
      color: "#ccc",
      textAlign: "center",
      fontSize: 12,
    },
  });
}
