import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ServiceOrder } from "@/hooks/useData";
import { STATUS_LABELS, MAINTENANCE_TYPE_LABELS } from "@/lib/constants";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Timer,
  User,
  Zap,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { differenceInMinutes } from "date-fns";

interface OrderCardProps {
  order: ServiceOrder;
  onClick: () => void;
}

interface MachineInfo {
  code: string;
  model: string | null;
  sector_name: string | null;
}

function formatElapsed(totalMinutes: number): string {
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const mins = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h ${String(mins).padStart(2, "0")}m`;
  return `${hours}h ${String(mins).padStart(2, "0")}m`;
}

function getElapsedColorClass(totalMinutes: number): string {
  if (totalMinutes > 1440) return "text-[hsl(var(--priority-critical))]";
  if (totalMinutes > 120) return "text-[hsl(var(--priority-medium))]";
  return "text-[hsl(var(--status-closed))]";
}

function getMaintenanceTypeClasses(type: "electronic" | "mechanical" | null): string {
  if (type === "electronic") {
    return "bg-status-progress/15 text-status-progress border-status-progress/40";
  }
  if (type === "mechanical") {
    return "bg-status-open/15 text-status-open border-status-open/40";
  }
  return "bg-muted text-muted-foreground border-border";
}

function getStatusClasses(status: ServiceOrder["status"]): string {
  switch (status) {
    case "open":
      return "bg-status-open/15 text-status-open border-status-open/40";
    case "in_progress":
      return "bg-status-closed/15 text-status-closed border-status-closed/40";
    case "closed":
      return "bg-status-closed/15 text-status-closed border-status-closed/40";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export function OrderCard({ order, onClick }: OrderCardProps) {
  const [machine, setMachine] = useState<MachineInfo | null>(null);
  const [firstTech, setFirstTech] = useState<string | null>(null);
  const [elapsedMin, setElapsedMin] = useState(0);

  const isClosed = order.status === "closed";

  useEffect(() => {
    const compute = () => {
      if (isClosed && order.finished_at) {
        setElapsedMin(
          differenceInMinutes(new Date(order.finished_at), new Date(order.created_at))
        );
      } else {
        setElapsedMin(differenceInMinutes(new Date(), new Date(order.created_at)));
      }
    };
    compute();
    if (!isClosed) {
      const interval = setInterval(compute, 60000);
      return () => clearInterval(interval);
    }
  }, [order.created_at, order.finished_at, isClosed]);

  useEffect(() => {
    if (order.machine_id) {
      supabase
        .from("machines")
        .select("code, model, sector_id, sectors(name)")
        .eq("id", order.machine_id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            const sector = (data as any).sectors;
            setMachine({
              code: data.code,
              model: data.model,
              sector_name: sector?.name || null,
            });
          }
        });
    }

    if (order.status !== "open") {
      supabase
        .from("work_logs")
        .select("technician_name")
        .eq("order_id", order.id)
        .order("started_at", { ascending: true })
        .limit(1)
        .then(({ data }) => {
          if (data && data.length > 0) {
            setFirstTech(data[0].technician_name);
          }
        });
    }
  }, [order.id, order.status, order.machine_id]);

  const maintenanceType = order.maintenance_type;

  return (
    <button
      onClick={onClick}
      className={cn(
        "industrial-card p-4 text-left w-full transition-all hover:border-primary/50 hover:shadow-lg",
        order.is_machine_stopped && "border-l-4 border-l-status-stopped"
      )}
    >
      {/* 1. Header: Sector + Machine */}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {machine?.sector_name ? (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <span className="truncate">{machine.sector_name}</span>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground italic">Carregando setor...</div>
          )}
          <div className="mt-1 font-mono text-lg font-bold text-foreground truncate">
            {machine ? (
              <>
                {machine.code}
                {machine.model && (
                  <span className="text-muted-foreground font-normal ml-2">
                    | {machine.model}
                  </span>
                )}
              </>
            ) : (
              <span className="text-muted-foreground">Carregando máquina...</span>
            )}
          </div>
        </div>
        {order.is_machine_stopped && (
          <span className="machine-stopped ml-2 shrink-0" title="Máquina parada">
            <AlertTriangle className="w-5 h-5" />
          </span>
        )}
      </div>

      {/* 2. Body: Maintenance type + Problem description */}
      <div className="mt-3 space-y-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold border",
              getMaintenanceTypeClasses(maintenanceType)
            )}
          >
            {maintenanceType === "electronic" ? (
              <Zap className="w-3 h-3" />
            ) : (
              <Wrench className="w-3 h-3" />
            )}
            {maintenanceType
              ? MAINTENANCE_TYPE_LABELS[maintenanceType]
              : "Tipo não informado"}
          </span>
        </div>
        <p className="text-base font-medium text-foreground line-clamp-2">
          {order.problem_description}
        </p>
      </div>

      {/* 3. Execution footer: Status + Technician */}
      <div className="mt-4 flex items-center gap-3">
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide border",
            getStatusClasses(order.status)
          )}
        >
          {order.status === "in_progress" ? (
            <>
              <Clock className="w-3 h-3" />
              {STATUS_LABELS[order.status]}
            </>
          ) : order.status === "closed" ? (
            <>
              <CheckCircle className="w-3 h-3" />
              {STATUS_LABELS[order.status]}
            </>
          ) : (
            <>
              <AlertTriangle className="w-3 h-3" />
              {STATUS_LABELS[order.status]}
            </>
          )}
        </span>

        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <User className="w-3.5 h-3.5" />
          {order.status === "open" ? (
            <span className="italic">Aguardando técnico</span>
          ) : firstTech ? (
            <span className="text-foreground font-medium truncate">{firstTech}</span>
          ) : (
            <span className="italic">Aguardando técnico</span>
          )}
        </div>
      </div>

      {/* 4. System footer: SAP + Elapsed time */}
      <div className="border-t border-border mt-3 pt-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs">
          {order.sap_notification_number ? (
            <span className="inline-flex items-center gap-1 text-status-closed font-medium">
              <CheckCircle className="w-3.5 h-3.5" />
              SAP #{order.sap_notification_number.slice(0, 8)}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              Aguardando SAP
            </span>
          )}
        </div>

        <div
          className={cn(
            "flex items-center gap-1 font-mono text-xs font-bold",
            getElapsedColorClass(elapsedMin)
          )}
        >
          <Timer className="w-3.5 h-3.5" />
          <span>{formatElapsed(elapsedMin)}</span>
        </div>
      </div>
    </button>
  );
}
