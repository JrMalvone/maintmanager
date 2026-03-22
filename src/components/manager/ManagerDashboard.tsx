import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ServiceOrder, Machine } from "@/hooks/useData";
import type { WorkLog } from "@/hooks/useWorkLogs";
import { KPICards } from "./KPICards";
import { BacklogChart } from "./BacklogChart";
import { ParetoChart } from "./ParetoChart";
import { TechnicianPerformance } from "./TechnicianPerformance";
import { OrderHistory } from "./OrderHistory";
import { CriticalDowntimeTable } from "./CriticalDowntimeTable";
import { DowntimeChart } from "./DowntimeChart";
import { DefectDonutChart } from "./DefectDonutChart";
import { OpenClosedTrendChart } from "./OpenClosedTrendChart";
import { DashboardFilters, getDefaultFilter, type DateFilter } from "./DashboardFilters";
import { Loader2 } from "lucide-react";
import { isWithinInterval, differenceInHours } from "date-fns";

export function ManagerDashboard() {
  const [allOrders, setAllOrders] = useState<ServiceOrder[]>([]);
  const [allWorkLogs, setAllWorkLogs] = useState<WorkLog[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<DateFilter>(getDefaultFilter);
  const [sectorId, setSectorId] = useState("all");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const [ordersRes, workLogsRes, machinesRes] = await Promise.all([
      supabase.from("service_orders").select("*").order("created_at", { ascending: false }),
      supabase.from("work_logs").select("*").order("started_at", { ascending: false }),
      supabase.from("machines").select("*"),
    ]);

    if (ordersRes.data) setAllOrders(ordersRes.data as ServiceOrder[]);
    if (workLogsRes.data) setAllWorkLogs(workLogsRes.data as WorkLog[]);
    if (machinesRes.data) setMachines(machinesRes.data);
    setLoading(false);
  }

  // Machine IDs belonging to selected sector
  const sectorMachineIds = sectorId === "all"
    ? null
    : new Set(machines.filter((m) => m.sector_id === sectorId).map((m) => m.id));

  // Filter by time
  const timeFilteredOrders = allOrders.filter((o) => {
    const date = new Date(o.created_at);
    return isWithinInterval(date, { start: filter.start, end: filter.end });
  });

  // Filter by sector
  const orders = sectorMachineIds
    ? timeFilteredOrders.filter((o) => o.machine_id && sectorMachineIds.has(o.machine_id))
    : timeFilteredOrders;

  const workLogs = allWorkLogs.filter((wl) => {
    const date = new Date(wl.started_at);
    return isWithinInterval(date, { start: filter.start, end: filter.end });
  });

  // Total period hours (for MTBF / Availability)
  const totalPeriodHours = differenceInHours(filter.end, filter.start);

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

      <DashboardFilters filter={filter} onChange={setFilter} sectorId={sectorId} onSectorChange={setSectorId} />

      <KPICards orders={orders} workLogs={workLogs} totalPeriodHours={totalPeriodHours} />

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BacklogChart orders={orders} dateFilter={filter} />
        <ParetoChart orders={orders} />
      </div>

      {/* Charts Row 2 - Advanced */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <DowntimeChart orders={orders} />
        <DefectDonutChart orders={orders} />
        <OpenClosedTrendChart orders={orders} dateFilter={filter} />
      </div>

      <TechnicianPerformance workLogs={workLogs} />
      <OrderHistory orders={orders} />
    </div>
  );
}
