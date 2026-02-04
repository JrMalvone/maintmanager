import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ServiceOrder } from "@/hooks/useData";
import { OrderCard } from "./OrderCard";
import { OrderFilters } from "./OrderFilters";
import { OrderDetailSheet } from "./OrderDetailSheet";
import { Loader2, ClipboardList } from "lucide-react";

export function TechnicianDashboard() {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [sectorFilter, setSectorFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchOrders();

    // Real-time subscription
    const channel = supabase
      .channel("technician_orders")
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
  }, []);

  async function fetchOrders() {
    const { data } = await supabase
      .from("service_orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) setOrders(data as ServiceOrder[]);
    setLoading(false);
  }

  function handleOrderClick(order: ServiceOrder) {
    setSelectedOrder(order);
    setSheetOpen(true);
  }

  // Filter orders
  const filteredOrders = orders.filter((order) => {
    if (statusFilter !== "all" && order.status !== statusFilter) return false;
    if (priorityFilter !== "all" && order.priority !== priorityFilter) return false;
    if (searchQuery && !order.problem_description.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Separate by status
  const openOrders = filteredOrders.filter((o) => o.status === "open");
  const inProgressOrders = filteredOrders.filter((o) => o.status === "in_progress");
  const closedOrders = filteredOrders.filter((o) => o.status === "closed");

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

      {/* Filters */}
      <OrderFilters
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        priorityFilter={priorityFilter}
        setPriorityFilter={setPriorityFilter}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* Orders Grid */}
      <div className="space-y-8">
        {/* Open Orders */}
        {openOrders.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="status-badge-open">Abertas ({openOrders.length})</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {openOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onClick={() => handleOrderClick(order)}
                />
              ))}
            </div>
          </section>
        )}

        {/* In Progress Orders */}
        {inProgressOrders.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="status-badge-progress">Em Andamento ({inProgressOrders.length})</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {inProgressOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onClick={() => handleOrderClick(order)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Closed Orders */}
        {closedOrders.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="status-badge-closed">Fechadas ({closedOrders.length})</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {closedOrders.slice(0, 6).map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onClick={() => handleOrderClick(order)}
                />
              ))}
            </div>
          </section>
        )}

        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <ClipboardList className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Nenhuma ordem encontrada</p>
          </div>
        )}
      </div>

      {/* Order Detail Sheet */}
      <OrderDetailSheet
        order={selectedOrder}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onUpdate={fetchOrders}
      />
    </div>
  );
}
