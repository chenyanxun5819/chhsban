import { useCallback, useState } from "react";
import apiClient from "@/utils/api";

interface AttendanceRecord {
  attendance_id: string;
  schedule_id: string;
  student_id: string;
  status: "present" | "absent" | "late";
  remarks?: string;
  created_at: number;
  updated_at: number;
}

interface AttendanceCreateData {
  schedule_id: string;
  student_id: string;
  status: "present" | "absent" | "late";
  remarks?: string;
}

interface UseAttendanceOptions {
  scheduleId?: string;
  classId?: string;
}

export const useAttendance = (scheduleId?: string) => {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(
    async (options: UseAttendanceOptions = {}) => {
      try {
        setLoading(true);
        setError(null);

        let url = "/api/v1/attendances";
        if (scheduleId || options.scheduleId) {
          url = `/api/v1/attendances?schedule=${scheduleId || options.scheduleId}`;
        } else if (options.classId) {
          url = `/api/v1/attendances?class=${options.classId}`;
        }

        const response = await apiClient.get(url);
        setAttendance(response.data || []);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Error fetching attendance";
        setError(message);
        console.error("useAttendance fetch error:", message);
      } finally {
        setLoading(false);
      }
    },
    [scheduleId],
  );

  const record = useCallback(async (data: AttendanceCreateData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.post(`/api/v1/attendances`, data);
      setAttendance((prev) => [...prev, response.data]);
      return response.data;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error recording attendance";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const update = useCallback(
    async (attendanceId: string, data: Partial<AttendanceCreateData>) => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.put(
          `/api/v1/attendances/${attendanceId}`,
          data,
        );
        setAttendance((prev) =>
          prev.map((a) =>
            a.attendance_id === attendanceId ? response.data : a,
          ),
        );
        return response.data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Error updating attendance";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const recordBatch = useCallback(async (records: AttendanceCreateData[]) => {
    try {
      setLoading(true);
      setError(null);
      const responses = await Promise.all(
        records.map((r) => apiClient.post(`/api/v1/attendances`, r)),
      );
      const newRecords = responses.map((r) => r.data);
      setAttendance((prev) => [...prev, ...newRecords]);
      return newRecords;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error recording batch attendance";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    attendance,
    loading,
    error,
    fetch,
    record,
    update,
    recordBatch,
    isEmpty: attendance.length === 0,
  };
};
