import {
  PREVENTIVE_MAINTENANCE_LABELS,
  PREVENTIVE_ORDER_TYPE_LABELS,
  PREVENTIVE_PRIORITY_LABELS,
  PreventiveMaintenanceType,
  PreventiveOrder,
  PreventivePriority,
  formatEstimatedMinutes,
} from "@/lib/preventiveOrders";
import { formatElapsedTime } from "@/lib/dateUtils";
import { SapStatusBadge } from "@/components/shared/SapStatusBadge";
import { cn } from "@/lib/utils";
import {
  CalendarCheck,
  Clock,
  Hammer,
  Lightbulb,
  Settings,
  ShoppingCart,
  Timer,
  User,
  Wrench,
  Zap,
} from "lucide-react";

interface PreventiveOrderCardProps {
  order: PreventiveOrder;
  machineLabelText: string;
  sectorNameText?: string;
  onClick: () => void;
}

const PRIORITY_CLASS: Record<PreventivePriority, string> = {
  critical: "priority-critical",
  high: "status-badge bg-orange-500/20 text-orange-400 border border-orange-500/50",
  medium: "priority-medium",
  low: "priority-low",
};

const MAINT_ICON: Record<PreventiveMaintenanceType, React.ComponentType<{ className?: string }>> = {
  electronic: Zap,
  mechanical: Settings,
  metalwork: Hammer,
  parts_purchase: ShoppingCart,
};

const MAINT_COLOR: Record<PreventiveMaintenanceType, string> = {
  electronic: "text-blue-400 border-blue-500/40 bg-blue-500/10",
  mechanical: "text-orange-400 border-orange-500/40 bg-orange-500/10",
  metalwork: "text-purple-400 border-purple-500/40 bg-purple-500/10",
  parts_purchase: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10",
};

export function PreventiveOrderCard({
  order,
  machineLabelText,
  sectorNameText,
  onClick,
}: PreventiveOrderCardProps) {
  const MaintIcon = MAINT_ICON[order.maintenance_type];
  const isPreventive = order.order_type === "preventive";

  const actualMinutes =
    order.started_at && order.finished_at
      ? Math.max(1, Math.round((new Date(order.finished_at).getTime() - new Date(order.started_at).getTime()) / 60000))
      : null;

  return (
    <div
      onClick={onClick}
      className="industrial-card p-4 cursor-pointer hover:border-primary/60 transition-all space-y-3"
    >
      {/* Top badges */}
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold border",
              isPreventive
                ? "bg-primary/15 text-primary border-primary/40"
                : "bg-amber-500/15 text-amber-400 border-amber-500/40"
            )}
          >
            {isPreventive ? <CalendarCheck className="w-3 h-3" /> : <Lightbulb className="w-3 h-3" />}
            {PREVENTIVE_ORDER_TYPE_LABELS[order.order_type]}
          </span>
          <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border", MAINT_COLOR[order.maintenance_type])}>
            <MaintIcon className="w-3 h-3" />
            {PREVENTIVE_MAINTENANCE_LABELS[order.maintenance_type]}
          </span>
        </div>
        <span className={PRIORITY_CLASS[order.priority]}>
          {PREVENTIVE_PRIORITY_LABELS[order.priority]}
        </span>
      </div>

      {/* Title & Machine */}
      <div>
        <h4 className="font-bold text-base leading-snug line-clamp-2">{order.title}</h4>
        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
          <Wrench className="w-3.5 h-3.5 shrink-0 text-primary" />
          <span className="font-mono font-semibold text-foreground">{machineLabelText}</span>
          {sectorNameText && <span>· {sectorNameText}</span>}
        </p>
      </div>

      <p className="text-sm text-muted-foreground line-clamp-2">{order.description}</p>

      {/* Estimated / Execution Time Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border text-xs">
        <div className="flex items-center gap-1.5">
          <Timer className="w-3.5 h-3.5 text-primary" />
          {order.estimated_minutes ? (
            <span className="font-semibold text-foreground">
              Previsto: {formatEstimatedMinutes(order.estimated_minutes)}
            </span>
          ) : (
            <span className="font-semibold text-amber-400">Estipular tempo</span>
          )}
        </div>

        {order.status === "in_progress" && order.started_at && (
          <span className="inline-flex items-center gap-1 text-status-progress font-semibold">
            <Clock className="w-3.5 h-3.5" />
            {formatElapsedTime(order.started_at)}
          </span>
        )}

        {order.status === "completed" && actualMinutes !== null && (
          <span className="text-emerald-400 font-semibold">
            Real: {formatEstimatedMinutes(actualMinutes)}
          </span>
        )}
      </div>

      {/* Footer: Requester / Tech & SAP badge on completion */}
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1 truncate">
          <User className="w-3.5 h-3.5 shrink-0" />
          {order.technician_name ? `Téc: ${order.technician_name}` : `Solic: ${order.opener_name}`}
        </span>

        {order.status === "completed" ? (
          <SapStatusBadge
            status={order.sap_sync_status}
            notificationNumber={order.sap_notification_number}
            syncMessage={order.sap_sync_message}
            compact
          />
        ) : (
          <span>
            {new Date(order.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
          </span>
        )}
      </div>
    </div>
  );
}