import { useMemo, useState } from "react";
import { usePreventiveOrders } from "@/hooks/usePreventiveOrders";
import { useMachines, useSectors } from "@/hooks/useData";
import {
  PREVENTIVE_MAINTENANCE_LABELS,
  PREVENTIVE_ORDER_TYPE_LABELS,
  PREVENTIVE_PRIORITY_LABELS,
  PREVENTIVE_PRIORITY_WEIGHT,
  PreventiveMaintenanceType,
  PreventiveOrder,
  PreventiveOrderType,
  PreventivePriority,
  formatEstimatedMinutes,
} from "@/lib/preventiveOrders";
import { machineLabel } from "@/lib/machineLabel";
import { SectorMultiSelect } from "@/components/technician/SectorMultiSelect";
import { PreventiveOrderCard } from "./PreventiveOrderCard";
import { PreventiveOrderDetailSheet } from "./PreventiveOrderDetailSheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClipboardList, Factory, Loader2, Search } from "lucide-react";

export function PreventiveDashboard() {
  const { orders, loading, refetch } = usePreventiveOrders();
  const { sectors } = useSectors();
  const { machines } = useMachines(undefined, false);

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [sectorIds, setSectorIds] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<"all" | PreventiveOrderType>("all");
  const [maintFilter, setMaintFilter] = useState<"all" | PreventiveMaintenanceType>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | PreventivePriority>("all");

  const machineMap = useMemo(() => new Map(machines.map((m) => [m.id, m])), [machines]);
  const sectorMap = useMemo(() => new Map(sectors.map((s) => [s.id, s.name])), [sectors]);

  const getSectorId = (o: PreventiveOrder) =>
    o.sector_id || (o.machine_id ? machineMap.get(o.machine_id)?.sector_id ?? null : null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (typeFilter !== "all" && o.order_type !== typeFilter) return false;
      if (maintFilter !== "all" && o.maintenance_type !== maintFilter) return false;
      if (priorityFilter !== "all" && o.priority !== priorityFilter) return false;
      if (sectorIds.length > 0) {
        const sid = getSectorId(o);
        if (!sid || !sectorIds.includes(sid)) return false;
      }
      if (q) {
        const m = o.machine_id ? machineMap.get(o.machine_id) : null;
        const hay = `${o.title} ${o.description} ${o.machine_number || ""} ${m?.model || ""} ${o.opener_name}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [orders, typeFilter, maintFilter, priorityFilter, sectorIds, search, machineMap]);

  const sortPriorityThenOldest = (a: PreventiveOrder, b: PreventiveOrder) => {
    const pw = PREVENTIVE_PRIORITY_WEIGHT[a.priority] - PREVENTIVE_PRIORITY_WEIGHT[b.priority];
    if (pw !== 0) return pw;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  };

  const pendingOrders = useMemo(
    () => filtered.filter((o) => o.status === "pending_planning").sort(sortPriorityThenOldest),
    [filtered]
  );
  const plannedOrders = useMemo(
    () => filtered.filter((o) => o.status === "planned").sort(sortPriorityThenOldest),
    [filtered]
  );
  const inProgressOrders = useMemo(
    () => filtered.filter((o) => o.status === "in_progress").sort(sortPriorityThenOldest),
    [filtered]
  );
  const completedOrders = useMemo(
    () =>
      filtered
        .filter((o) => o.status === "completed" || o.status === "canceled")
        .sort((a, b) => new Date(b.finished_at || b.updated_at).getTime() - new Date(a.finished_at || a.updated_at).getTime()),
    [filtered]
  );

  const plannedTotalMinutes = useMemo(
    () => plannedOrders.reduce((acc, o) => acc + (o.estimated_minutes || 0), 0),
    [plannedOrders]
  );

  const selectedOrder = orders.find((o) => o.id === selectedOrderId) ?? null;

  function openOrder(order: PreventiveOrder) {
    setSelectedOrderId(order.id);
    setSheetOpen(true);
  }

  function renderGrouped(list: PreventiveOrder[], emptyText: string) {
    if (list.length === 0) {
      return (
        <div className="text-center py-12">
          <ClipboardList className="w-14 h-14 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">{emptyText}</p>
        </div>
      );
    }

    const bySector = new Map<string, PreventiveOrder[]>();
    for (const o of list) {
      const key = getSectorId(o) || "none";
      const arr = bySector.get(key) ?? [];
      arr.push(o);
      bySector.set(key, arr);
    }

    const groups: { id: string; name: string; items: PreventiveOrder[] }[] = [];
    for (const s of sectors) {
      const items = bySector.get(s.id);
      if (items?.length) groups.push({ id: s.id, name: s.name, items });
    }
    const ungrouped = bySector.get("none");
    if (ungrouped?.length) groups.push({ id: "none", name: "Sem setor", items: ungrouped });

    return (
      <div className="space-y-6">
        {groups.map((g) => (
          <section key={g.id} className="space-y-3">
            <div className="flex items-center gap-2 border-b border-border pb-2">
              <Factory className="w-4 h-4 text-primary" />
              <h2 className="text-base font-bold uppercase tracking-tight">{g.name}</h2>
              <span className="text-xs text-muted-foreground">({g.items.length})</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {g.items.map((o) => {
                const m = o.machine_id ? machineMap.get(o.machine_id) : null;
                const mText = m ? machineLabel(m) : o.machine_number || "Geral do setor";
                return (
                  <PreventiveOrderCard
                    key={o.id}
                    order={o}
                    machineLabelText={mText}
                    sectorNameText={sectorMap.get(getSectorId(o) || "")}
                    onClick={() => openOrder(o)}
                  />
                );
              })}
            </div>
          </section>
        ))}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Preventivas &amp; Backlog</h1>
        <p className="text-sm text-muted-foreground">
          Planejamento em reunião, estimativa de tempo e execução isolada da manutenção corretiva
        </p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="industrial-card p-3.5">
          <p className="text-xs uppercase text-muted-foreground font-semibold">Aguard. Planejamento</p>
          <p className="text-2xl font-bold text-amber-400 mt-1">{pendingOrders.length}</p>
        </div>
        <div className="industrial-card p-3.5">
          <p className="text-xs uppercase text-muted-foreground font-semibold">Planejadas</p>
          <p className="text-2xl font-bold text-primary mt-1">
            {plannedOrders.length}
            {plannedTotalMinutes > 0 && (
              <span className="text-xs font-normal text-muted-foreground ml-2">
                ({formatEstimatedMinutes(plannedTotalMinutes)})
              </span>
            )}
          </p>
        </div>
        <div className="industrial-card p-3.5">
          <p className="text-xs uppercase text-muted-foreground font-semibold">Em Andamento</p>
          <p className="text-2xl font-bold text-status-progress mt-1">{inProgressOrders.length}</p>
        </div>
        <div className="industrial-card p-3.5">
          <p className="text-xs uppercase text-muted-foreground font-semibold">Concluídas</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{completedOrders.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="industrial-card p-2.5 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar título, máquina ou descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-8 text-sm"
          />
        </div>
        <SectorMultiSelect sectors={sectors} selected={sectorIds} onChange={setSectorIds} />
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as "all" | PreventiveOrderType)}>
          <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Classificação" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Preventiva e Backlog</SelectItem>
            {(Object.keys(PREVENTIVE_ORDER_TYPE_LABELS) as PreventiveOrderType[]).map((k) => (
              <SelectItem key={k} value={k}>{PREVENTIVE_ORDER_TYPE_LABELS[k]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={maintFilter} onValueChange={(v) => setMaintFilter(v as "all" | PreventiveMaintenanceType)}>
          <SelectTrigger className="w-[145px] h-8 text-xs"><SelectValue placeholder="Área" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as áreas</SelectItem>
            {(Object.keys(PREVENTIVE_MAINTENANCE_LABELS) as PreventiveMaintenanceType[]).map((k) => (
              <SelectItem key={k} value={k}>{PREVENTIVE_MAINTENANCE_LABELS[k]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as "all" | PreventivePriority)}>
          <SelectTrigger className="w-[125px] h-8 text-xs"><SelectValue placeholder="Prioridade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas prior.</SelectItem>
            {(Object.keys(PREVENTIVE_PRIORITY_LABELS) as PreventivePriority[]).map((k) => (
              <SelectItem key={k} value={k}>{PREVENTIVE_PRIORITY_LABELS[k]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Workflow Tabs */}
      <Tabs defaultValue="pending_planning" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto gap-1 p-1">
          <TabsTrigger value="pending_planning" className="text-xs sm:text-sm py-1.5">
            Planejar ({pendingOrders.length})
          </TabsTrigger>
          <TabsTrigger value="planned" className="text-xs sm:text-sm py-1.5">
            Planejadas ({plannedOrders.length})
          </TabsTrigger>
          <TabsTrigger value="in_progress" className="text-xs sm:text-sm py-1.5">
            Em Andamento ({inProgressOrders.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="text-xs sm:text-sm py-1.5">
            Concluídas ({completedOrders.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending_planning" className="mt-4">
          {renderGrouped(pendingOrders, "Nenhuma ordem aguardando planejamento.")}
        </TabsContent>
        <TabsContent value="planned" className="mt-4">
          {renderGrouped(plannedOrders, "Nenhuma ordem planejada aguardando execução.")}
        </TabsContent>
        <TabsContent value="in_progress" className="mt-4">
          {renderGrouped(inProgressOrders, "Nenhuma ordem em andamento no momento.")}
        </TabsContent>
        <TabsContent value="completed" className="mt-4">
          {renderGrouped(completedOrders, "Nenhuma ordem concluída encontrada.")}
        </TabsContent>
      </Tabs>

      <PreventiveOrderDetailSheet
        order={selectedOrder}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        sectors={sectors}
        machines={machines}
        onUpdate={refetch}
      />
    </div>
  );
}