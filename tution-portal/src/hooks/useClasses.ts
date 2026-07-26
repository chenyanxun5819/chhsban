import { useCallback, useState, useEffect } from "react";
import apiClient from "@/utils/api";
import { TutionClass } from "@/types";

interface UseClassesOptions {
  teacherId?: string;
  status?: string;
  autoFetch?: boolean;
}

export const useClasses = (
  options: UseClassesOptions = { autoFetch: true },
) => {
  const { teacherId, status, autoFetch = true } = options;
  const [classes, setClasses] = useState<TutionClass[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (teacherId) params.append("teacher", teacherId);
      if (status) params.append("status", status);

      const queryString = params.toString();
      const url = queryString
        ? `/api/v1/classes?${queryString}`
        : "/api/v1/classes";

      const response = await apiClient.get(url);
      setClasses(response.data || []);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error fetching classes";
      setError(message);
      console.error("useClasses error:", message);
    } finally {
      setLoading(false);
    }
  }, [teacherId, status]);

  useEffect(() => {
    if (autoFetch) {
      fetch();
    }
  }, [fetch, autoFetch]);

  return {
    classes,
    loading,
    error,
    refresh: fetch,
    isEmpty: classes.length === 0,
  };
};
