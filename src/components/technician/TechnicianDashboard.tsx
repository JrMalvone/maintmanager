import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ServiceOrder } from "@/hooks/useData";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OrderCard } from "./OrderCard";
import { OrderDetailSheet } from "./OrderDetailSheet";
import { Loader2, ClipboardList, CalendarIcon } from "lucide-react";
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
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const [machines, setMachines] = useState<{ id: string; sector_id: string | null }[]>([]);
  const [sectors, setSectors] = useState<{ id: string; name: string }[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [historyDate, setHistoryDate] = useState<Date | undefined>();
  const [sectorFilter, setSectorFilter] = useState("all");

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

  function handleOrderClick(order: ServiceOrder) {
    setSelectedOrder(order);
    setSheetOpen(true);
  }

  // Active orders (open + in_progress), sorted oldest first
  const activeOrders = orders
    .filter((o) => o.status === "open" || o.status === "in_progress")
    .filter((o) =>
      searchQuery
        ? o.problem_description.toLowerCase().includes(searchQuery.toLowerCase())
        : true
    );

  const openOrders = activeOrders.filter((o) => o.status === "open");
  const inProgressOrders = activeOrders.filter((o) => o.status === "in_progress");

  // History (closed), sorted newest first by finished_at, with optional date filter
  const closedOrders = orders
    .filter((o) => o.status === "closed")
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
    .filter((o) =>
      searchQuery
        ? o.problem_description.toLowerCase().includes(searchQuery.toLowerCase())
        : true
    )
    .sort((a, b) => {
      const dateA = a.finished_at ? new Date(a.finished_at).getTime() : 0;
      const dateB = b.finished_at ? new Date(b.finished_at).getTime() : 0;
      return dateB - dateA;
    });

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
            Ativas ({openOrders.length + inProgressOrders.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="h-10">
            Histórico ({closedOrders.length})
          </TabsTrigger>
        </TabsList>

        {/* Active Orders Tab */}
        <TabsContent value="active" className="mt-6 space-y-6">
          {/* Search */}
          <div className="industrial-card p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por descrição..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10"
              />
            </div>
          </div>

          {/* Open */}
          {openOrders.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="status-badge-open">Abertas ({openOrders.length})</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {openOrders.map((order) => (
                  <OrderCard key={order.id} order={order} onClick={() => handleOrderClick(order)} />
                ))}
              </div>
            </section>
          )}

          {/* In Progress */}
          {inProgressOrders.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="status-badge-progress">Em Andamento ({inProgressOrders.length})</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {inProgressOrders.map((order) => (
                  <OrderCard key={order.id} order={order} onClick={() => handleOrderClick(order)} />
                ))}
              </div>
            </section>
          )}

          {activeOrders.length === 0 && (
            <div className="text-center py-12">
              <ClipboardList className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Nenhuma ordem ativa encontrada</p>
            </div>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-6 space-y-6">
          {/* Filters */}
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
            </div>
          </div>

          {closedOrders.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {closedOrders.map((order) => (
                <OrderCard key={order.id} order={order} onClick={() => handleOrderClick(order)} />
              ))}
            </div>
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
