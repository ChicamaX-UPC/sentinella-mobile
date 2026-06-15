import { useEffect, useState } from "react";

import { apiJson } from "../api/client";
import type { NodeRow, PageResponse } from "../api/types";

export function useNodeLabels(enabled = true) {
  const [labels, setLabels] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!enabled) return;
    void apiJson<PageResponse<NodeRow>>("nodes", {}, { page: 0, limit: 200 })
      .then((res) => {
        const map: Record<string, string> = {};
        for (const node of res.content ?? []) {
          map[node.id] = node.alias?.trim() || node.name?.trim() || node.id;
        }
        setLabels(map);
      })
      .catch(() => {});
  }, [enabled]);

  function getNodeLabel(nodeId: string | undefined): string {
    if (!nodeId) return "—";
    return labels[nodeId] ?? nodeId.slice(0, 8) + "…";
  }

  return { getNodeLabel, labels };
}
