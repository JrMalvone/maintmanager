import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Sector {
  id: string;
  name: string;
  description: string | null;
}

interface Machine {
  id: string;
  code: string;
  sector_id: string | null;
  model: string | null;
  manufacturer: string | null;
}

interface ServiceOrder {
  id: string;
  machine_id: string | null;
  operator_id: string;
  technician_id: string | null;
  problem_description: string;
  solution_description: string | null;
  status: "open" | "in_progress" | "closed";
  is_machine_stopped: boolean;
  priority: "low" | "medium" | "critical";
  spare_parts_used: string[] | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  opener_name: string | null;
  opener_registry: string | null;
  technician_name: string | null;
  technician_registry: string | null;
  maintenance_type: "electronic" | "mechanical" | null;
  sap_sync_status: string | null;
  sap_notification_number: string | null;
  sap_sync_message: string | null;
  // SAP-formatted fields
  is_breakdown: boolean;
  work_center: string | null;
  malf_start_date: string | null;
  malf_start_time: string | null;
  malf_end_date: string | null;
  malf_end_time: string | null;
  apontamentos: any[] | null;
  machine_number: string | null;
}

export function useSectors() {
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSectors() {
      const { data } = await supabase
        .from("sectors")
        .select("*")
        .order("name");
      
      if (data) setSectors(data);
      setLoading(false);
    }
    fetchSectors();
  }, []);

  return { sectors, loading };
}

export function useMachines(sectorId?: string, activeOnly = true) {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMachines() {
      let query = supabase.from("machines").select("*").order("code");
      
      if (sectorId) {
        query = query.eq("sector_id", sectorId);
      }

      if (activeOnly) {
        query = query.eq("status", "active");
      }

      const { data } = await query;
      if (data) setMachines(data);
      setLoading(false);
    }
    fetchMachines();
  }, [sectorId, activeOnly]);

  return { machines, loading };
}

export function useServiceOrders(status?: "open" | "in_progress" | "closed") {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrders() {
      let query = supabase
        .from("service_orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (status) {
        query = query.eq("status", status);
      }

      const { data } = await query;
      if (data) setOrders(data as ServiceOrder[]);
      setLoading(false);
    }
    fetchOrders();

    // Real-time subscription
    const channel = supabase
      .channel("service_orders_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "service_orders",
        },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [status]);

  return { orders, loading };
}

export type { Sector, Machine, ServiceOrder };
