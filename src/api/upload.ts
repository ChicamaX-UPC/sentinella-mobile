import { ApiError, apiFetch } from "./client";

export type ChecklistPhotoUploadResponse = {
  photoS3Key: string;
};

export async function uploadChecklistPhoto(
  roundId: string,
  itemId: string,
  localUri: string,
  mime: string,
): Promise<ChecklistPhotoUploadResponse> {
  const ext = mime.includes("png") ? "png" : "jpg";
  const form = new FormData();
  form.append(
    "file",
    {
      uri: localUri,
      name: `checklist.${ext}`,
      type: mime,
    } as unknown as Blob,
  );

  const res = await apiFetch(`rounds/${roundId}/items/${itemId}/photo`, {
    method: "POST",
    body: form,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new ApiError(res.status, text);
  }
  return JSON.parse(text) as ChecklistPhotoUploadResponse;
}

/** Resuelve photoS3Key subiendo borrador local si existe (online). */
export async function resolvePhotoS3KeyForItem(
  roundId: string,
  itemId: string,
  bodyJson: string,
): Promise<string> {
  const { getPhotoDraft } = await import("../offline/photos");
  const draft = await getPhotoDraft(roundId, itemId);
  if (!draft) {
    return bodyJson;
  }
  const uploaded = await uploadChecklistPhoto(roundId, itemId, draft.uri, draft.mime);
  const body = bodyJson ? (JSON.parse(bodyJson) as Record<string, unknown>) : {};
  body.photoS3Key = uploaded.photoS3Key;
  return JSON.stringify(body);
}
