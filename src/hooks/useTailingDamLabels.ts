import { useCallback, useEffect, useState } from "react";

import { apiJson } from "@/api/client";
import type { RelaveResource } from "@/api/types";
import { useSession } from "@/auth/SessionContext";
import { formatTailingDamLabel } from "@/labels/tailing-dams";

export type TailingDamOption = { id: string; label: string };

export function useTailingDamLabels(enabled = true) {
  const { user } = useSession();
  const [fromApi, setFromApi] = useState<TailingDamOption[]>([]);

  useEffect(() => {
    if (!enabled) return;
    void apiJson<RelaveResource[]>("relaves")
      .then((relaves) =>
        setFromApi(
          (relaves ?? []).map((r) => ({
            id: r.tailingDamId,
            label: formatTailingDamLabel(r.tailingDamId, r.name),
          })),
        ),
      )
      .catch(() => setFromApi([]));
  }, [enabled]);

  const options: TailingDamOption[] = (() => {
    const map = new Map<string, string>();
    for (const o of fromApi) map.set(o.id, o.label);
    for (const id of user?.tailingDamIds ?? []) {
      if (!map.has(id)) map.set(id, formatTailingDamLabel(id));
    }
    return [...map.entries()]
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "es"));
  })();

  const getTailingDamLabel = useCallback(
    (id: string | undefined) => {
      if (!id) return "—";
      return options.find((o) => o.id === id)?.label ?? formatTailingDamLabel(id);
    },
    [options],
  );

  return { options, getTailingDamLabel };
}
