// Saved-chart list for the signed-in user. Fetched once per sign-in; mutations
// update the local list optimistically after the server confirms.
import { useCallback, useEffect, useState } from "react";
import { createChart, deleteChart, listCharts, updateChart } from "@/lib/api";
import type { SavedChart, SavedChartInput } from "@/types/api";
import { useAuth } from "@/auth";

export function useSavedCharts() {
  const { user, enabled } = useAuth();
  const [charts, setCharts] = useState<SavedChart[]>([]);
  const [limit, setLimit] = useState<number>(user?.chart_limit ?? 10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const userId = user?.id ?? null;

  const refresh = useCallback(async () => {
    if (!enabled || !userId) {
      setCharts([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await listCharts();
      setCharts(res.charts);
      setLimit(res.limit);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [enabled, userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const save = useCallback(async (input: SavedChartInput) => {
    const { chart } = await createChart(input);
    setCharts((prev) => [chart, ...prev]);
    return chart;
  }, []);

  const update = useCallback(async (id: string, patch: Partial<SavedChartInput>) => {
    const { chart } = await updateChart(id, patch);
    setCharts((prev) => [chart, ...prev.filter((c) => c.id !== id)]);
    return chart;
  }, []);

  const remove = useCallback(async (id: string) => {
    await deleteChart(id);
    setCharts((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return { charts, limit, loading, error, refresh, save, update, remove };
}
