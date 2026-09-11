import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ServiceOrder } from "@/hooks/useData";
import { OrderCard } from "./OrderCard";
import { OrderDetailSheet } from "./OrderDetailSheet";
import { SectorMultiSelect } from "./SectorMultiSelect";
import { Loader2, ClipboardList, CalendarIcon, Factory } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";

export function TechnicianDashboard() {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const [machines, setMachines] = useState<{ id: string; sector_id: string | null }[]>([]);
  const [sectors, setSectors] = useState<{ id: string; name: string }[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [historyDate, setHistoryDate] = useState<Date | undefined>();
  const [sectorIds, setSectorIds] = useState<string[]>([]);

  useEffect(() => {
    fetchOrders();
    fetchSectorData();


    const channel = supabase
      .channel("technician_orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "service_orders" },
        () => fetchOrders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchOrders() {
    const { data } = await supabase
      .from("service_orders")
      .select("*")
      .order("created_at", { ascending: true });

    if (data) setOrders(data as ServiceOrder[]);
    setLoading(false);
  }

  async function fetchSectorData() {
    const [machinesRes, sectorsRes] = await Promise.all([
      supabase.from("machines").select("id, sector_id"),
      supabase.from("sectors").select("id, name").order("name"),
    ]);
    if (machinesRes.data) setMachines(machinesRes.data);
    if (sectorsRes.data) setSectors(sectorsRes.data);
  }

  const machineSector = new Map(machines.map((m) => [m.id, m.sector_id]));
  const sectorName = new Map(sectors.map((s) => [s.id, s.name]));

  const orderSectorId = (o: ServiceOrder): string | null =>
    o.machine_id ? machineSector.get(o.machine_id) ?? null : null;

  const matchesSector = (o: ServiceOrder) =>
    sectorIds.length === 0 ||
    (orderSectorId(o) !== null && sectorIds.includes(orderSectorId(o)!));

  const matchesSearch = (o: ServiceOrder) =>
    searchQuery
      ? o.problem_description.toLowerCase().includes(searchQuery.toLowerCase())
      : true;

  function handleOrderClick(order: ServiceOrder) {
    setSelectedOrderId(order.id);
    setSheetOpen(true);
  }

  // Always derive the selected order from the latest fetched list so the
  // detail sheet reflects updates (status, technician, SAP fields) immediately
  const selectedOrder =
    orders.find((o) => o.id === selectedOrderId) ?? null;

  // Active orders (open + in_progress), sorted oldest first
  const activeOrders = orders
    .filter((o) => o.status === "open" || o.status === "in_progress")
    .filter(matchesSector)
    .filter(matchesSearch);

  // History (closed), sorted newest first by finished_at, with optional date filter
  const closedOrders = orders
    .filter((o) => o.status === "closed")
    .filter(matchesSector)
    .filter((o) => {
      if (!historyDate) return true;
      const createdDate = new Date(o.created_at);
      const finishedDate = o.finished_at ? new Date(o.finished_at) : null;
      const matchesCreated =
        createdDate.getFullYear() === historyDate.getFullYear() &&
        createdDate.getMonth() === historyDate.getMonth() &&
        createdDate.getDate() === historyDate.getDate();
      const matchesFinished = finishedDate
        ? finishedDate.getFullYear() === historyDate.getFullYear() &&
          finishedDate.getMonth() === historyDate.getMonth() &&
          finishedDate.getDate() === historyDate.getDate()
        : false;
      return matchesCreated || matchesFinished;
    })
    .filter(matchesSearch)
    .sort((a, b) => {
      const dateA = a.finished_at ? new Date(a.finished_at).getTime() : 0;
      const dateB = b.finished_at ? new Date(b.finished_at).getTime() : 0;
      return dateB - dateA;
    });

  // Group helper: returns ordered list of [sectorLabel, orders]
  function groupBySector(list: ServiceOrder[]): { id: string; name: string; orders: ServiceOrder[] }[] {
    const groups: { id: string; name: string; orders: ServiceOrder[] }[] = [];
    const byId = new Map<string, ServiceOrder[]>();
    const noSector: ServiceOrder[] = [];

    for (const order of list) {
      const sid = orderSectorId(order);
      if (!sid) {
        noSector.push(order);
        continue;
      }
      if (!byId.has(sid)) byId.set(sid, []);
      byId.get(sid)!.push(order);
    }

    // Keep sectors in alphabetical order (sectors already sorted by name)
    for (const sector of sectors) {
      const sectorOrders = byId.get(sector.id);
      if (sectorOrders && sectorOrders.length > 0) {
        groups.push({ id: sector.id, name: sector.name, orders: sectorOrders });
      }
    }
    // Sectors that may not be in the loaded list
    for (const [sid, sectorOrders] of byId) {
      if (!sectors.some((s) => s.id === sid)) {
        groups.push({ id: sid, name: sectorName.get(sid) ?? "Setor desconhecido", orders: sectorOrders });
      }
    }
    if (noSector.length > 0) {
      groups.push({ id: "none", name: "Sem setor", orders: noSector });
    }
    return groups;
  }

  const activeGroups = groupBySector(activeOrders);
  const closedGroups = groupBySector(closedOrders);

  const activeOpenCount = activeOrders.filter((o) => o.status === "open").length;
  const activeInProgressCount = activeOrders.filter((o) => o.status === "in_progress").length;

  function renderSectorGroups(groups: { id: string; name: string; orders: ServiceOrder[] }[]) {
    return groups.map((group) => {
      const groupOpen = group.orders.filter((o) => o.status === "open");
      const groupInProgress = group.orders.filter((o) => o.status === "in_progress");
      const groupClosed = group.orders.filter((o) => o.status === "closed");

      return (
        <section key={group.id} className="space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-2">
            <Factory className="w-4 h-4 text-primary" />
            <h2 className="text-lg font-bold tracking-tight uppercase">{group.name}</h2>
            <span className="text-sm text-muted-foreground">({group.orders.length})</span>
          </div>

          {groupOpen.length > 0 && (
            <div>
              <h3 className="text-base font-semibold mb-3">
                <span className="status-badge-open">Abertas ({groupOpen.length})</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupOpen.map((order) => (
                  <OrderCard key={order.id} order={order} onClick={() => handleOrderClick(order)} />
                ))}
              </div>
            </div>
          )}

          {groupInProgress.length > 0 && (
            <div>
              <h3 className="text-base font-semibold mb-3">
                <span className="status-badge-progress">Em Andamento ({groupInProgress.length})</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupInProgress.map((order) => (
                  <OrderCard key={order.id} order={order} onClick={() => handleOrderClick(order)} />
                ))}
              </div>
            </div>
          )}

          {groupClosed.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupClosed.map((order) => (
                <OrderCard key={order.id} order={order} onClick={() => handleOrderClick(order)} />
              ))}
            </div>
          )}
        </section>
      );
    });
  }

  const filterCard = (showDate: boolean) => (
    <div className="industrial-card p-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por descrição..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10"
          />
        </div>
        <SectorMultiSelect sectors={sectors} selected={sectorIds} onChange={setSectorIds} />
        {showDate && (
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[200px] justify-start text-left font-normal h-10",
                    !historyDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {historyDate
                    ? format(historyDate, "dd/MM/yyyy", { locale: ptBR })
                    : "Filtrar por data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={historyDate}
                  onSelect={setHistoryDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            {historyDate && (
              <Button variant="ghost" size="sm" onClick={() => setHistoryDate(undefined)} className="h-10">
                Limpar
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ordens de Serviço</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie as ordens de manutenção da fábrica
        </p>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-12">
          <TabsTrigger value="active" className="h-10">
            Ativas ({activeOpenCount + activeInProgressCount})
          </TabsTrigger>
          <TabsTrigger value="history" className="h-10">
            Histórico ({closedOrders.length})
          </TabsTrigger>
        </TabsList>

        {/* Active Orders Tab */}
        <TabsContent value="active" className="mt-6 space-y-8">
          {filterCard(false)}

          {activeOrders.length > 0 ? (
            renderSectorGroups(activeGroups)
          ) : (
            <div className="text-center py-12">
              <ClipboardList className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Nenhuma ordem ativa encontrada</p>
            </div>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-6 space-y-8">
          {filterCard(true)}

          {closedOrders.length > 0 ? (
            renderSectorGroups(closedGroups)
          ) : (
            <div className="text-center py-12">
              <ClipboardList className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Nenhuma ordem fechada encontrada</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <OrderDetailSheet
        order={selectedOrder}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onUpdate={fetchOrders}
      />
    </div>
  );
}
