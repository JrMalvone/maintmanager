import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ServiceOrder } from "@/hooks/useData";
import { formatElapsedTime, getElapsedClass } from "@/lib/dateUtils";
import { STATUS_LABELS } from "@/lib/constants";
import { Clock, AlertTriangle, CheckCircle, Wrench, Zap, Settings, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface OrderCardProps {
  order: ServiceOrder;
  onClick: () => void;
}

interface ActiveTechCount {
  count: number;
}

export function OrderCard({ order, onClick }: OrderCardProps) {
  const elapsedClass = getElapsedClass(order.created_at);
  const elapsed = formatElapsedTime(order.created_at);
  const [activeTechCount, setActiveTechCount] = useState(0);

  useEffect(() => {
    if (order.status === "in_progress") {
      fetchActiveTechCount();
    }

    async function fetchActiveTechCount() {
      const { count } = await supabase
        .from("work_logs")
        .select("*", { count: "exact", head: true })
        .eq("order_id", order.id)
        .is("ended_at", null);

      setActiveTechCount(count || 0);
    }
  }, [order.id, order.status]);

  return (
    <button
      onClick={onClick}
      className={cn(
        "industrial-card p-4 text-left w-full transition-all hover:border-primary/50 hover:shadow-lg",
        order.is_machine_stopped && "border-l-4 border-l-status-stopped"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {/* Maintenance Type Badge */}
          {order.maintenance_type === "electronic" ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-500 border border-blue-500/50">
              <Zap className="w-3 h-3" />
              Elétrico
            </span>
          ) : order.maintenance_type === "mechanical" ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-orange-500/20 text-orange-500 border border-orange-500/50">
              <Settings className="w-3 h-3" />
              Mecânico
            </span>
          ) : null}
          {order.is_machine_stopped && (
            <span className="machine-stopped">
              <AlertTriangle className="w-4 h-4" />
            </span>
          )}
        </div>
        <div className={cn("flex items-center gap-1 text-sm", elapsedClass)}>
          <Clock className="w-4 h-4" />
          {elapsed}
        </div>
      </div>

      {/* Opener Info */}
      {order.opener_name && (
        <p className="text-xs text-muted-foreground mb-2">
          Aberto por: <span className="font-medium text-foreground">{order.opener_name}</span>
          {order.opener_registry && <span className="ml-1">({order.opener_registry})</span>}
        </p>
      )}

      {/* Active Team Info for In Progress orders */}
      {order.status === "in_progress" && activeTechCount > 0 && (
        <div className="flex items-center gap-2 mb-2 px-2 py-1 rounded bg-status-progress/10 border border-status-progress/30">
          <Users className="w-3.5 h-3.5 text-status-progress" />
          <p className="text-xs text-status-progress font-medium">
            {activeTechCount} técnico{activeTechCount > 1 ? "s" : ""} trabalhando
          </p>
        </div>
      )}

      {/* Problem Description */}
      <p className="text-sm line-clamp-2 mb-3">{order.problem_description}</p>

      {/* Status */}
      <div className="flex items-center justify-between">
        <span className={`status-badge-${order.status.replace("_", "")}`}>
          {order.status === "in_progress" ? (
            <>
              <Wrench className="w-3 h-3 mr-1" />
              {STATUS_LABELS[order.status]}
            </>
          ) : order.status === "closed" ? (
            <>
              <CheckCircle className="w-3 h-3 mr-1" />
              {STATUS_LABELS[order.status]}
            </>
          ) : (
            STATUS_LABELS[order.status]
          )}
        </span>
        <span className="text-xs text-muted-foreground font-mono">
          #{order.id.slice(0, 8)}
        </span>
      </div>
    </button>
  );
}
