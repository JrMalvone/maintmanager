import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ServiceOrder, Machine } from "@/hooks/useData";
import type { WorkLog } from "@/hooks/useWorkLogs";
import { KPICards } from "./KPICards";
import { BacklogChart } from "./BacklogChart";
import { ParetoChart } from "./ParetoChart";
import { TechnicianPerformance } from "./TechnicianPerformance";

import { CriticalDowntimeTable } from "./CriticalDowntimeTable";
import { DowntimeChart } from "./DowntimeChart";
import { DefectDonutChart } from "./DefectDonutChart";
import { OpenClosedTrendChart } from "./OpenClosedTrendChart";
import { OrderDetailSheet } from "@/components/technician/OrderDetailSheet";
import { DashboardFilters, loadSavedFilter, saveFilter, loadSavedSector, saveSector, presetRange, type DateFilter } from "./DashboardFilters";
import { Loader2, FileSpreadsheet, FileText } from "lucide-react";
import { isWithinInterval, differenceInHours } from "date-fns";
import { Button } from "@/components/ui/button";
import { useAppAuth } from "@/hooks/useAppAuth";
import { exportDashboardExcel } from "@/lib/exportDashboardExcel";
import { exportDashboardPdf } from "@/lib/exportDashboardPdf";

export function ManagerDashboard() {
  const { role } = useAppAuth();
  const [allOrders, setAllOrders] = useState<ServiceOrder[]>([]);
  const [allWorkLogs, setAllWorkLogs] = useState<WorkLog[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [sectors, setSectors] = useState<{ id: string; name: string; shifts_count: number }[]>([]);
  const [staff, setStaff] = useState<{ registration_number: string; preferred_sector_id: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilterState] = useState<DateFilter>(loadSavedFilter);
  const [sectorId, setSectorIdState] = useState(loadSavedSector);
  const setFilter = (f: DateFilter) => { setFilterState(f); saveFilter(f); };
  const setSectorId = (id: string) => { setSectorIdState(id); saveSector(id); };

  // Keep preset periods aligned with "today" when the day changes
  useEffect(() => {
    const t = setInterval(() => {
      setFilterState((f) => {
        if (f.preset === "custom") return f;
        const next = presetRange(f.preset);
        return next.end.getTime() === f.end.getTime() ? f : next;
      });
    }, 60_000);
    return () => clearInterval(t);
  }, []);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const [ordersRes, workLogsRes, machinesRes, sectorsRes, staffRes] = await Promise.all([
      supabase.from("service_orders").select("*").order("created_at", { ascending: false }),
      supabase.from("work_logs").select("*").order("started_at", { ascending: false }),
      supabase.from("machines").select("*"),
      supabase.from("sectors").select("id, name, shifts_count"),
      supabase.from("maintenance_staff").select("registration_number, preferred_sector_id"),
    ]);

    if (ordersRes.data) setAllOrders(ordersRes.data as ServiceOrder[]);
    if (workLogsRes.data) setAllWorkLogs(workLogsRes.data as WorkLog[]);
    if (machinesRes.data) setMachines(machinesRes.data);
    if (sectorsRes.data) setSectors(sectorsRes.data);
    if (staffRes.data) setStaff(staffRes.data);
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

  // Planned operating hours = days elapsed in filter × (shifts × 8h), summed per sector with active machines
  const effectiveEnd = filter.end > new Date() ? new Date() : filter.end;
  const periodDays = Math.max(differenceInHours(effectiveEnd, filter.start), 0) / 24;
  const activeSectorIds = new Set(
    machines
      .filter((m) => (m as { status?: string }).status !== "inactive" && m.sector_id)
      .map((m) => m.sector_id as string)
  );
  const totalPeriodHours = sectors
    .filter((s) => activeSectorIds.has(s.id) && (sectorId === "all" || s.id === sectorId))
    .reduce((acc, s) => acc + periodDays * (s.shifts_count ?? 3) * 8, 0);

  const shiftsByMachine = new Map(
    machines.map((m) => [m.id, sectors.find((s) => s.id === m.sector_id)?.shifts_count ?? 3])
  );

  // Technician performance: staff whose preferred sector is the filtered one, counting all their work (any sector)
  const sectorStaffRegs = sectorId === "all"
    ? null
    : new Set(staff.filter((s) => s.preferred_sector_id === sectorId).map((s) => s.registration_number));
  const techWorkLogs = sectorStaffRegs
    ? workLogs.filter((l) => l.technician_registry && sectorStaffRegs.has(l.technician_registry))
    : workLogs;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Analytics</h1>
          <p className="text-muted-foreground mt-2">
            Indicadores de desempenho da manutenção industrial
          </p>
        </div>
        {role === "gestor" && (() => {
          const params = {
            orders, workLogs, machines, techWorkLogs, techOrders: allOrders,
            sectorNames: new Map(sectors.map((s) => [s.id, s.name])),
            shiftsByMachine, start: filter.start, end: filter.end,
            sectorLabel: sectorId === "all" ? "Todos" : sectors.find((s) => s.id === sectorId)?.name ?? "",
          };
          return (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => exportDashboardPdf(params)}>
                <FileText className="w-4 h-4 mr-2" /> Relatório PDF
              </Button>
              <Button variant="outline" onClick={() => exportDashboardExcel(params)}>
                <FileSpreadsheet className="w-4 h-4 mr-2" /> Exportar Excel
              </Button>
            </div>
          );
        })()}
      </div>

      <DashboardFilters filter={filter} onChange={setFilter} sectorId={sectorId} onSectorChange={setSectorId} />

      <KPICards
        orders={orders}
        workLogs={workLogs}
        totalPeriodHours={totalPeriodHours}
        shiftsByMachine={shiftsByMachine}
      />

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BacklogChart orders={orders} dateFilter={filter} />
        <ParetoChart orders={orders} />
      </div>

      {/* Charts Row 2 - Advanced */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <DowntimeChart orders={orders} shiftsByMachine={shiftsByMachine} />
        <DefectDonutChart orders={orders} />
        <OpenClosedTrendChart orders={orders} dateFilter={filter} />
      </div>

      <CriticalDowntimeTable
        orders={orders}
        machines={machines}
        onOrderClick={(order) => { setSelectedOrderId(order.id); setSheetOpen(true); }}
        shiftsByMachine={shiftsByMachine}
      />
      <TechnicianPerformance workLogs={techWorkLogs} orders={allOrders} shiftsByMachine={shiftsByMachine} />
      <OrderDetailSheet
        order={allOrders.find((order) => order.id === selectedOrderId) ?? null}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onUpdate={fetchData}
      />
    </div>
  );
}
