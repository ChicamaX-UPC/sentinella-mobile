import { router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { ApiError, apiJson } from "@/api/client";
import { uploadChecklistPhoto } from "@/api/upload";
import { markSyncedNow, MobileShell } from "@/components/MobileShell";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useOnline } from "@/hooks/useOnline";
import { enqueueMutation } from "@/offline/outbox";
import {
  deletePhotoDraftsForItem,
  getPhotoDraft,
  savePhotoDraft,
} from "@/offline/photos";
import { colors, radii, spacing } from "@/theme/colors";

export default function RoundItemScreen() {
  const { roundId, itemId } = useLocalSearchParams<{
    roundId: string;
    itemId: string;
  }>();
  const online = useOnline();
  const [observations, setObservations] = useState("");
  const [anomaly, setAnomaly] = useState(false);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [geoBusy, setGeoBusy] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoMime, setPhotoMime] = useState("image/jpeg");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!roundId || !itemId) return;
    void getPhotoDraft(roundId, itemId).then((draft) => {
      if (draft) {
        setPhotoUri(draft.uri);
        setPhotoMime(draft.mime);
      }
    });
  }, [roundId, itemId]);

  async function captureGeo() {
    setGeoBusy(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Permiso de ubicación denegado");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLat(pos.coords.latitude);
      setLng(pos.coords.longitude);
    } catch {
      setError("No se pudo obtener la ubicación");
    } finally {
      setGeoBusy(false);
    }
  }

  async function pickPhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      setError("Permiso de cámara denegado");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      allowsEditing: false,
    });
    if (result.canceled || !roundId || !itemId) return;
    const asset = result.assets[0];
    await savePhotoDraft(roundId, itemId, asset.uri, asset.mimeType ?? "image/jpeg");
    setPhotoUri(asset.uri);
    setPhotoMime(asset.mimeType ?? "image/jpeg");
  }

  async function buildBody(photoS3Key?: string) {
    const body: Record<string, unknown> = {
      observations: observations.trim() || "Campo",
      anomaly,
    };
    if (lat != null && lng != null) {
      body.latitude = lat;
      body.longitude = lng;
    }
    if (photoS3Key) {
      body.photoS3Key = photoS3Key;
    }
    return JSON.stringify(body);
  }

  async function onSubmit() {
    if (!roundId || !itemId) return;
    setBusy(true);
    setError(null);

    try {
      let photoS3Key: string | undefined;
      if (photoUri && online) {
        const uploaded = await uploadChecklistPhoto(roundId, itemId, photoUri, photoMime);
        photoS3Key = uploaded.photoS3Key;
      }

      const body = await buildBody(photoS3Key);

      if (!online) {
        await enqueueMutation({
          method: "PATCH",
          path: `rounds/${roundId}/items/${itemId}`,
          body,
          createdAt: Date.now(),
        });
        router.back();
        return;
      }

      await apiJson(`rounds/${roundId}/items/${itemId}`, {
        method: "PATCH",
        body,
      });
      await deletePhotoDraftsForItem(roundId, itemId);
      await markSyncedNow();
      router.back();
    } catch (err: unknown) {
      if (!online) {
        const body = await buildBody();
        await enqueueMutation({
          method: "PATCH",
          path: `rounds/${roundId}/items/${itemId}`,
          body,
          createdAt: Date.now(),
        });
        router.back();
        return;
      }
      setError(err instanceof ApiError ? err.body || `Error ${err.status}` : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <MobileShell title="Hallazgo" showBack>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.hint}>
          Observación, foto (S3/MinIO) y geolocalización
        </Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.card}>
          <Text style={styles.label}>Observaciones</Text>
          <TextInput
            value={observations}
            onChangeText={setObservations}
            multiline
            numberOfLines={4}
            style={styles.input}
            placeholderTextColor={colors.dim}
          />

          <PrimaryButton title="Tomar foto" variant="secondary" onPress={() => void pickPhoto()} />
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photo} />
          ) : null}

          <PrimaryButton
            title={geoBusy ? "GPS…" : "Capturar ubicación"}
            variant="secondary"
            loading={geoBusy}
            onPress={() => void captureGeo()}
          />
          {lat != null && lng != null ? (
            <Text style={styles.coords}>
              {lat.toFixed(5)}, {lng.toFixed(5)}
            </Text>
          ) : null}

          <View style={styles.row}>
            <Text style={styles.label}>Anomalía</Text>
            <Switch value={anomaly} onValueChange={setAnomaly} />
          </View>

          <PrimaryButton
            title={busy ? "Enviando…" : "Guardar"}
            loading={busy}
            onPress={() => void onSubmit()}
          />
        </View>
      </ScrollView>
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.xl },
  hint: { color: colors.muted, fontSize: 12 },
  error: { color: colors.warning, fontSize: 14 },
  card: {
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: spacing.md,
    gap: spacing.sm,
  },
  label: { color: colors.muted, fontSize: 12 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.bg,
    color: colors.text,
    padding: spacing.sm,
    minHeight: 96,
    textAlignVertical: "top",
  },
  photo: {
    width: "100%",
    height: 180,
    borderRadius: radii.md,
    marginTop: spacing.sm,
  },
  coords: { color: colors.dim, fontSize: 12 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: spacing.sm,
  },
});
