import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface WorkLog {
  id: string;
  order_id: string;
  technician_name: string;
  technician_registry: string | null;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  created_at: string;
}

export function useWorkLogs(orderId?: string) {
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) {
      setWorkLogs([]);
      setLoading(false);
      return;
    }

    fetchWorkLogs();

    // Real-time subscription
    const channel = supabase
      .channel(`work_logs_${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "work_logs",
          filter: `order_id=eq.${orderId}`,
        },
        () => {
          fetchWorkLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };

    async function fetchWorkLogs() {
      const { data } = await supabase
        .from("work_logs")
        .select("*")
        .eq("order_id", orderId)
        .order("started_at", { ascending: true });

      if (data) setWorkLogs(data as WorkLog[]);
      setLoading(false);
    }
  }, [orderId]);

  return { workLogs, loading };
}

export function useAllWorkLogs() {
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllWorkLogs();

    // Real-time subscription
    const channel = supabase
      .channel("all_work_logs")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "work_logs",
        },
        () => {
          fetchAllWorkLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };

    async function fetchAllWorkLogs() {
      const { data } = await supabase
        .from("work_logs")
        .select("*")
        .order("started_at", { ascending: false });

      if (data) setWorkLogs(data as WorkLog[]);
      setLoading(false);
    }
  }, []);

  return { workLogs, loading };
}

// Helper to get active technicians on an order
export function getActiveTechnicians(workLogs: WorkLog[]): WorkLog[] {
  return workLogs.filter((log) => log.ended_at === null);
}

// Helper to calculate total man-hours for an order
export function calculateTotalManHours(workLogs: WorkLog[]): number {
  return workLogs.reduce((acc, log) => acc + (log.duration_minutes || 0), 0);
}
