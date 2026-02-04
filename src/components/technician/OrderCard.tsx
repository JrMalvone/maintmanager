import type { ServiceOrder } from "@/hooks/useData";
import { formatElapsedTime, getElapsedClass } from "@/lib/dateUtils";
import { STATUS_LABELS, PRIORITY_LABELS } from "@/lib/constants";
import { Clock, AlertTriangle, CheckCircle, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

interface OrderCardProps {
  order: ServiceOrder;
  onClick: () => void;
}

export function OrderCard({ order, onClick }: OrderCardProps) {
  const elapsedClass = getElapsedClass(order.created_at);
  const elapsed = formatElapsedTime(order.created_at);

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
          <span className={`priority-${order.priority}`}>
            {PRIORITY_LABELS[order.priority]}
          </span>
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
