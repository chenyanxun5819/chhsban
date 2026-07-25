import { useCallback, useState } from "react";
import apiClient from "@/utils/api";

interface TutionSchedule {
  schedule_id: string;
  class_id: string;
  schedule_date: string;
  status: "held" | "cancelled" | "rescheduled";
  attendance_count?: number;
  total_students?: number;
  remarks?: string;
  created_at: number;
  updated_at: number;
}

interface ScheduleCreateData {
  class_id: string;
  schedule_date: string;
  status: "held" | "cancelled" | "rescheduled";
  remarks?: string;
  rescheduled_to?: string;
}

interface UseScheduleOptions {
  classId?: string;
}

export const useSchedule = (classId?: string) => {
  const [schedules, setSchedules] = useState<TutionSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(
    async (options: UseScheduleOptions = {}) => {
      if (!classId && !options.classId) {
        setError("classId is required");
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const id = options.classId || classId;
        const url = `/api/v1/schedules?class=${id}`;

        const response = await apiClient.get(url);
        setSchedules(response.data || []);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Error fetching schedules";
        setError(message);
        console.error("useSchedule fetch error:", message);
      } finally {
        setLoading(false);
      }
    },
    [classId]
  );

  const create = useCallback(
    async (data: ScheduleCreateData) => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.post(`/api/v1/schedules`, data);
        setSchedules((prev) => [...prev, response.data]);
        return response.data;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error creating schedule";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const update = useCallback(
    async (scheduleId: string, data: Partial<ScheduleCreateData>) => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.put(`/api/v1/schedules/${scheduleId}`, data);
        setSchedules((prev) =>
          prev.map((s) => (s.schedule_id === scheduleId ? response.data : s))
        );
        return response.data;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error updating schedule";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const remove = useCallback(async (scheduleId: string) => {
    try {
      setLoading(true);
      setError(null);
      await apiClient.delete(`/api/v1/schedules/${scheduleId}`);
      setSchedules((prev) => prev.filter((s) => s.schedule_id !== scheduleId));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error deleting schedule";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    schedules,
    loading,
    error,
    fetch,
    create,
    update,
    remove,
    isEmpty: schedules.length === 0,
  };
};
