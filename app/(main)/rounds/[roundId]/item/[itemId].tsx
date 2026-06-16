import { router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { ApiError, apiJson } from "@/api/client";
import type { Round } from "@/api/types";
import { uploadChecklistPhoto } from "@/api/upload";
import { AppScrollView } from "@/components/AppScrollView";
import { markSyncedNow, MobileShell } from "@/components/MobileShell";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useOnline } from "@/hooks/useOnline";
import {
  applyLocalItemCompletion,
  enqueueMutation,
  loadRoundSnapshot,
  persistRoundFromApi,
  saveRoundSnapshot,
} from "@/offline/outbox";
import {
  deleteGeoDraftForItem,
  deletePhotoDraftsForItem,
  getGeoDraft,
  getPhotoDraft,
  saveGeoDraft,
  savePhotoDraft,
} from "@/offline/photos";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing } from "@/theme/tokens";

function normalizeParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default function RoundItemScreen() {
  const params = useLocalSearchParams<{ roundId: string; itemId: string }>();
  const roundId = normalizeParam(params.roundId);
  const itemId = normalizeParam(params.itemId);
  const online = useOnline();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [pointName, setPointName] = useState<string | null>(null);
  const [required, setRequired] = useState(true);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [observations, setObservations] = useState("");
  const [anomaly, setAnomaly] = useState(false);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [geoBusy, setGeoBusy] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoMime, setPhotoMime] = useState("image/jpeg");
  const [savedHint, setSavedHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!roundId || !itemId) return;
    void Promise.all([getPhotoDraft(roundId, itemId), getGeoDraft(roundId, itemId)]).then(
      ([photo, geo]) => {
        if (photo) {
          setPhotoUri(photo.uri);
          setPhotoMime(photo.mime);
        }
        if (geo) {
          setLat(geo.latitude);
          setLng(geo.longitude);
        }
      },
    );
  }, [roundId, itemId]);

  useEffect(() => {
    if (!roundId || !itemId) return;
    setLoadingMeta(true);
    apiJson<Round>(`rounds/${roundId}`)
      .then((round) => {
        void saveRoundSnapshot(roundId, JSON.stringify(round));
        const item = round.checklistItems?.find((it) => it.id === itemId);
        setPointName(item?.pointName ?? null);
        setRequired(item?.required !== false);
      })
      .catch(async () => {
        const snap = await loadRoundSnapshot(roundId);
        if (!snap) return;
        try {
          const round = JSON.parse(snap) as Round;
          const item = round.checklistItems?.find((it) => it.id === itemId);
          setPointName(item?.pointName ?? null);
          setRequired(item?.required !== false);
        } catch {
          /* ignore */
        }
      })
      .finally(() => setLoadingMeta(false));
  }, [roundId, itemId]);

  async function captureGeo() {
    if (!roundId || !itemId) return;
    setGeoBusy(true);
    setError(null);
    setSavedHint(null);
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
      await saveGeoDraft(roundId, itemId, pos.coords.latitude, pos.coords.longitude);
      setSavedHint("Ubicación capturada");
    } catch {
      setError("No se pudo obtener la ubicación");
    } finally {
      setGeoBusy(false);
    }
  }

  async function pickPhoto() {
    if (!roundId || !itemId) return;
    setError(null);
    setSavedHint(null);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      setError("Permiso de cámara denegado");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      allowsEditing: false,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    try {
      await savePhotoDraft(roundId, itemId, asset.uri, asset.mimeType ?? "image/jpeg");
      const draft = await getPhotoDraft(roundId, itemId);
      setPhotoUri(draft?.uri ?? asset.uri);
      setPhotoMime(draft?.mime ?? asset.mimeType ?? "image/jpeg");
      setSavedHint("Foto guardada en borrador");
    } catch {
      setError("No se pudo guardar la foto localmente");
    }
  }

  function buildPayload(photoS3Key?: string) {
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
    return body;
  }

  async function persistLocalCompletion(body: Record<string, unknown>) {
    if (!roundId || !itemId) return;
    await applyLocalItemCompletion(roundId, itemId, {
      observations: String(body.observations ?? "Campo"),
      anomaly: Boolean(body.anomaly),
      latitude: typeof body.latitude === "number" ? body.latitude : null,
      longitude: typeof body.longitude === "number" ? body.longitude : null,
      photoS3Key: typeof body.photoS3Key === "string" ? body.photoS3Key : null,
    });
  }

  async function onSubmit() {
    if (!roundId || !itemId) return;
    setBusy(true);
    setError(null);
    setSavedHint(null);

    try {
      let photoS3Key: string | undefined;
      let photoPending = false;
      const photoDraft = await getPhotoDraft(roundId, itemId);
      const uploadUri = photoDraft?.uri ?? photoUri;
      const uploadMime = photoDraft?.mime ?? photoMime;

      if (uploadUri && online) {
        try {
          const uploaded = await uploadChecklistPhoto(
            roundId,
            itemId,
            uploadUri,
            uploadMime,
          );
          photoS3Key = uploaded.photoS3Key;
        } catch {
          photoPending = true;
        }
      } else if (uploadUri) {
        photoPending = true;
      }

      const body = buildPayload(photoS3Key);
      const bodyJson = JSON.stringify(body);

      if (!online) {
        await enqueueMutation({
          method: "PATCH",
          path: `rounds/${roundId}/items/${itemId}`,
          body: bodyJson,
          createdAt: Date.now(),
        });
        await persistLocalCompletion(body);
        router.back();
        return;
      }

      try {
        const updated = await apiJson<Round>(`rounds/${roundId}/items/${itemId}`, {
          method: "PATCH",
          body: bodyJson,
        });
        await persistRoundFromApi(roundId, updated);
        if (photoS3Key) {
          await deletePhotoDraftsForItem(roundId, itemId);
        }
        await deleteGeoDraftForItem(roundId, itemId);
        await markSyncedNow();
        if (photoPending) {
          setSavedHint("Ítem guardado; la foto quedará en cola si falló la subida");
        }
        router.back();
      } catch (err: unknown) {
        await enqueueMutation({
          method: "PATCH",
          path: `rounds/${roundId}/items/${itemId}`,
          body: bodyJson,
          createdAt: Date.now(),
        });
        await persistLocalCompletion(body);
        if (err instanceof ApiError) {
          setSavedHint("Sin conexión estable: guardado en cola local");
        }
        router.back();
      }
    } finally {
      setBusy(false);
    }
  }

  const screenTitle = pointName ?? "Punto de control";

  return (
    <MobileShell title={screenTitle} showBack>
      <AppScrollView contentContainerStyle={styles.content} trackCollapse={false}>
        {loadingMeta ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <View style={styles.header}>
            <Text style={styles.pointName}>{pointName ?? "Punto de control"}</Text>
            <Text style={styles.required}>
              {required ? "Ítem obligatorio" : "Ítem opcional"}
            </Text>
          </View>
        )}

        <Text style={styles.hint}>
          Observación, foto y geolocalización para el registro de campo
        </Text>
        {savedHint ? <Text style={styles.ok}>{savedHint}</Text> : null}
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
            <>
              <Image source={{ uri: photoUri }} style={styles.photo} />
              <Text style={styles.dim}>Foto lista · se enviará al guardar</Text>
            </>
          ) : null}

          <PrimaryButton
            title={geoBusy ? "GPS…" : "Capturar ubicación"}
            variant="secondary"
            loading={geoBusy}
            onPress={() => void captureGeo()}
          />
          {lat != null && lng != null ? (
            <Text style={styles.coords}>
              GPS: {lat.toFixed(5)}, {lng.toFixed(5)}
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
      </AppScrollView>
    </MobileShell>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    content: { gap: spacing.md, paddingBottom: spacing.xl },
    header: { gap: 4 },
    pointName: { color: colors.text, fontSize: 18, fontWeight: "700" },
    required: { color: colors.muted, fontSize: 13 },
    hint: { color: colors.muted, fontSize: 12 },
    ok: { color: colors.success, fontSize: 13 },
    error: { color: colors.warning, fontSize: 14 },
    dim: { color: colors.dim, fontSize: 12 },
    card: {
      gap: spacing.sm,
      paddingVertical: spacing.sm,
    },
    label: { color: colors.muted, fontSize: 13 },
    input: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      color: colors.text,
      paddingVertical: spacing.sm,
      minHeight: 96,
      textAlignVertical: "top",
      fontSize: 15,
    },
    photo: {
      width: "100%",
      height: 180,
      borderRadius: radii.md,
      marginTop: spacing.sm,
    },
    coords: { color: colors.success, fontSize: 12, fontWeight: "600" },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginVertical: spacing.sm,
    },
  });
}
