import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ServiceOrder } from "@/hooks/useData";
import type { WorkLog } from "@/hooks/useWorkLogs";
import { KPICards } from "./KPICards";
import { BacklogChart } from "./BacklogChart";
import { ParetoChart } from "./ParetoChart";
import { TechnicianPerformance } from "./TechnicianPerformance";
import { OrderHistory } from "./OrderHistory";
import { Loader2 } from "lucide-react";

export function ManagerDashboard() {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const [ordersRes, workLogsRes] = await Promise.all([
      supabase
        .from("service_orders")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("work_logs")
        .select("*")
        .order("started_at", { ascending: false }),
    ]);

    if (ordersRes.data) setOrders(ordersRes.data as ServiceOrder[]);
    if (workLogsRes.data) setWorkLogs(workLogsRes.data as WorkLog[]);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Indicadores de desempenho da manutenção industrial
        </p>
      </div>

      {/* KPI Cards */}
      <KPICards orders={orders} workLogs={workLogs} />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BacklogChart orders={orders} />
        <ParetoChart orders={orders} />
      </div>

      {/* Technician Performance */}
      <TechnicianPerformance workLogs={workLogs} />

      {/* Order History with opener/technician info */}
      <OrderHistory orders={orders} />
    </div>
  );
}
