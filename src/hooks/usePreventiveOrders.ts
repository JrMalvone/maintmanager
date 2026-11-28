import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/fetchAllRows";
import type { PreventiveOrder, PreventiveWorkLog } from "@/lib/preventiveOrders";
import { toast } from "sonner";

export function usePreventiveOrders() {
  const [orders, setOrders] = useState<PreventiveOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    const [openRes, closedRes] = await Promise.all([
      fetchAllRows((from, to) =>
        supabase
          .from("preventive_backlog_orders")
          .select("*")
          .in("status", ["pending_planning", "waiting_parts", "planned", "in_progress"])
          .order("created_at", { ascending: true })
          .order("id")
          .range(from, to)
      ),
      fetchAllRows((from, to) =>
        supabase
          .from("preventive_backlog_orders")
          .select("*")
          .in("status", ["completed", "canceled"])
          .order("finished_at", { ascending: false, nullsFirst: false })
          .order("id")
          .range(from, to)
      ),
    ]);

    if (openRes.error || closedRes.error) {
      toast.error("Não foi possível carregar todas as ordens preventivas/backlog.");
    }

    setOrders((prev) => [
      ...((openRes.data as PreventiveOrder[] | null) ??
        prev.filter((o) => o.status !== "completed" && o.status !== "canceled")),
      ...((closedRes.data as PreventiveOrder[] | null) ??
        prev.filter((o) => o.status === "completed" || o.status === "canceled")),
    ]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOrders();
    const timer = window.setInterval(fetchOrders, 60000);
    const onFocus = () => fetchOrders();
    window.addEventListener("focus", onFocus);
    const channel = supabase
      .channel("preventive_backlog_orders_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "preventive_backlog_orders" },
        () => fetchOrders()
      )
      .subscribe();

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      supabase.removeChannel(channel);
    };
  }, [fetchOrders]);

  return { orders, loading, refetch: fetchOrders };
}

export function usePreventiveWorkLogs(orderId?: string) {
  const [workLogs, setWorkLogs] = useState<PreventiveWorkLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    if (!orderId) {
      setWorkLogs([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("preventive_work_logs")
      .select("*")
      .eq("order_id", orderId)
      .order("started_at", { ascending: true });

    if (data) setWorkLogs(data as PreventiveWorkLog[]);
    setLoading(false);
  }, [orderId]);

  useEffect(() => {
    fetchLogs();
    if (!orderId) return;

    const channel = supabase
      .channel(`preventive_work_logs_${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "preventive_work_logs",
          filter: `order_id=eq.${orderId}`,
        },
        () => fetchLogs()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, fetchLogs]);

  return { workLogs, loading, refetch: fetchLogs };
}