import type { ServiceOrder } from "@/hooks/useData";
import { differenceInMinutes } from "date-fns";
import {
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Wrench,
} from "lucide-react";

interface KPICardsProps {
  orders: ServiceOrder[];
}

export function KPICards({ orders }: KPICardsProps) {
  // Calculate MTTR (Mean Time To Repair)
  const closedOrders = orders.filter(
    (o) => o.status === "closed" && o.started_at && o.finished_at
  );
  
  const totalRepairTime = closedOrders.reduce((acc, order) => {
    const minutes = differenceInMinutes(
      new Date(order.finished_at!),
      new Date(order.started_at!)
    );
    return acc + minutes;
  }, 0);
  
  const mttr = closedOrders.length > 0 
    ? Math.round(totalRepairTime / closedOrders.length) 
    : 0;
  const mttrFormatted = mttr < 60 
    ? `${mttr} min` 
    : `${Math.floor(mttr / 60)}h ${mttr % 60}m`;

  // Count by status
  const openCount = orders.filter((o) => o.status === "open").length;
  const inProgressCount = orders.filter((o) => o.status === "in_progress").length;
  const closedCount = closedOrders.length;

  // Calculate downtime (stopped machines with open or in_progress orders)
  const stoppedOrders = orders.filter(
    (o) => o.is_machine_stopped && o.status !== "closed"
  );
  const downtimeHours = stoppedOrders.reduce((acc, order) => {
    const minutes = differenceInMinutes(new Date(), new Date(order.created_at));
    return acc + minutes;
  }, 0);
  const downtimeFormatted = `${Math.floor(downtimeHours / 60)}h`;

  // Critical orders count
  const criticalCount = orders.filter(
    (o) => o.priority === "critical" && o.status !== "closed"
  ).length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {/* MTTR */}
      <div className="kpi-card">
        <div className="flex items-center justify-between mb-2">
          <Clock className="w-5 h-5 text-primary" />
          <span className="text-xs text-muted-foreground">Média</span>
        </div>
        <p className="kpi-value text-primary">{mttrFormatted}</p>
        <p className="kpi-label">MTTR</p>
      </div>

      {/* Open Orders */}
      <div className="kpi-card">
        <div className="flex items-center justify-between mb-2">
          <AlertTriangle className="w-5 h-5 text-status-open" />
          <span className="text-xs text-muted-foreground">Pendentes</span>
        </div>
        <p className="kpi-value text-status-open">{openCount}</p>
        <p className="kpi-label">Abertas</p>
      </div>

      {/* In Progress */}
      <div className="kpi-card">
        <div className="flex items-center justify-between mb-2">
          <Wrench className="w-5 h-5 text-status-progress" />
          <span className="text-xs text-muted-foreground">Agora</span>
        </div>
        <p className="kpi-value text-status-progress">{inProgressCount}</p>
        <p className="kpi-label">Em Andamento</p>
      </div>

      {/* Closed */}
      <div className="kpi-card">
        <div className="flex items-center justify-between mb-2">
          <CheckCircle className="w-5 h-5 text-status-closed" />
          <span className="text-xs text-muted-foreground">Total</span>
        </div>
        <p className="kpi-value text-status-closed">{closedCount}</p>
        <p className="kpi-label">Fechadas</p>
      </div>

      {/* Critical */}
      <div className="kpi-card">
        <div className="flex items-center justify-between mb-2">
          <TrendingUp className="w-5 h-5 text-priority-critical" />
          <span className="text-xs text-muted-foreground">Urgente</span>
        </div>
        <p className="kpi-value text-priority-critical">{criticalCount}</p>
        <p className="kpi-label">Críticas</p>
      </div>
    </div>
  );
}
