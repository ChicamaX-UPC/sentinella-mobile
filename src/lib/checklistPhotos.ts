import { API_V1 } from "@/config/api";

export function checklistPhotoApiUrl(roundId: string, itemId: string): string {
  return `${API_V1}/rounds/${roundId}/items/${itemId}/photo`;
}
