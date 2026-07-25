import { useCallback, useState } from "react";
import apiClient from "@/utils/api";
import { TutionRoster } from "@/types";

interface UseRosterOptions {
  classId?: string;
  status?: string;
}

export const useRoster = (classId?: string) => {
  const [roster, setRoster] = useState<TutionRoster[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(
    async (options: UseRosterOptions = {}) => {
      if (!classId && !options.classId) {
        setError("classId is required");
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const id = options.classId || classId;
        const params = new URLSearchParams();
        if (options.status) params.append("status", options.status);

        const queryString = params.toString();
        const url = queryString
          ? `/api/v1/rosters?class=${id}&${queryString}`
          : `/api/v1/rosters?class=${id}`;

        const response = await apiClient.get(url);
        setRoster(response.data || []);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error fetching roster";
        setError(message);
        console.error("useRoster error:", message);
      } finally {
        setLoading(false);
      }
    },
    [classId]
  );

  const add = useCallback(
    async (students: TutionRoster[]) => {
      try {
        setLoading(true);
        const response = await apiClient.post(`/api/v1/rosters`, {
          class_id: classId,
          students,
        });
        setRoster((prev) => [...prev, ...response.data]);
        return response.data;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error adding students";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [classId]
  );

  const remove = useCallback(async (rosterId: string) => {
    try {
      setLoading(true);
      await apiClient.delete(`/api/v1/rosters/${rosterId}`);
      setRoster((prev) => prev.filter((r) => r.roster_id !== rosterId));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error removing student";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const update = useCallback(
    async (rosterId: string, data: Partial<TutionRoster>) => {
      try {
        setLoading(true);
        const response = await apiClient.put(`/api/v1/rosters/${rosterId}`, data);
        setRoster((prev) =>
          prev.map((r) => (r.roster_id === rosterId ? response.data : r))
        );
        return response.data;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error updating student";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    roster,
    loading,
    error,
    fetch,
    add,
    remove,
    update,
    isEmpty: roster.length === 0,
  };
};
