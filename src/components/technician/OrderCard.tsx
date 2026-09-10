import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ServiceOrder } from "@/hooks/useData";
import { formatDateTime } from "@/lib/dateUtils";
import { STATUS_LABELS } from "@/lib/constants";
import { Clock, AlertTriangle, CheckCircle, Wrench, Users, User, Timer, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { differenceInMinutes } from "date-fns";
import { SapStatusBadge } from "@/components/shared/SapStatusBadge";

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
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  return `${hours}h ${String(mins).padStart(2, "0")}m`;
}

function getElapsedColorClass(totalMinutes: number): string {
  if (totalMinutes > 1440) return "text-[hsl(var(--priority-critical))]";
  if (totalMinutes > 120) return "text-[hsl(var(--priority-medium))]";
  return "text-[hsl(var(--status-closed))]";
}

export function OrderCard({ order, onClick }: OrderCardProps) {
  const [machine, setMachine] = useState<MachineInfo | null>(null);
  const [firstTech, setFirstTech] = useState<string | null>(null);
  const [activeTechCount, setActiveTechCount] = useState(0);
  const [elapsedMin, setElapsedMin] = useState(0);

  const isClosed = order.status === "closed";

  // Compute elapsed minutes
  useEffect(() => {
    const compute = () => {
      if (isClosed && order.finished_at) {
        setElapsedMin(differenceInMinutes(new Date(order.finished_at), new Date(order.created_at)));
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

    if (order.status === "in_progress") {
      supabase
        .from("work_logs")
        .select("*", { count: "exact", head: true })
        .eq("order_id", order.id)
        .is("ended_at", null)
        .then(({ count }) => {
          setActiveTechCount(count || 0);
        });
    }
  }, [order.id, order.status, order.machine_id]);

  return (
    <button
      onClick={onClick}
      className={cn(
        "industrial-card p-4 text-left w-full transition-all hover:border-primary/50 hover:shadow-lg",
        order.is_machine_stopped && "border-l-4 border-l-status-stopped"
      )}
    >
      {/* Header: Machine info + Timer */}
      <div className="flex items-start justify-between mb-2">
        <div className="font-mono font-bold text-sm text-foreground truncate flex-1">
          {machine ? (
            <>
              {machine.code}
              {machine.model && (
                <span className="text-muted-foreground font-normal ml-1">| {machine.model}</span>
              )}
            </>
          ) : (
            <span className="text-muted-foreground">Carregando...</span>
          )}
        </div>
        <div className="flex items-center gap-1 ml-2 shrink-0">
          {order.is_machine_stopped && (
            <span className="machine-stopped">
              <AlertTriangle className="w-4 h-4" />
            </span>
          )}
          <div className={cn("flex items-center gap-1 font-mono text-xs font-bold", getElapsedColorClass(elapsedMin))}>
            <Timer className="w-3.5 h-3.5" />
            <span>{formatElapsed(elapsedMin)}</span>
          </div>
        </div>
      </div>

      {/* Date & Time Opened */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
        <Clock className="w-3.5 h-3.5" />
        {formatDateTime(order.created_at)}
        {isClosed && (
          <span className="ml-2 text-muted-foreground italic">Tempo total</span>
        )}
      </div>

      {/* Problem Description */}
      <p className="text-sm line-clamp-2 mb-3">{order.problem_description}</p>

      {/* Technician info */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
        <User className="w-3.5 h-3.5" />
        {order.status === "open" ? (
          <span className="italic">Aguardando técnico</span>
        ) : firstTech ? (
          <span className="text-foreground font-medium">{firstTech}</span>
        ) : (
          <span className="italic">Aguardando técnico</span>
        )}
      </div>

      {/* Active team count */}
      {order.status === "in_progress" && activeTechCount > 0 && (
        <div className="flex items-center gap-2 mb-3 px-2 py-1 rounded bg-status-progress/10 border border-status-progress/30">
          <Users className="w-3.5 h-3.5 text-status-progress" />
          <p className="text-xs text-status-progress font-medium">
            {activeTechCount} técnico{activeTechCount > 1 ? "s" : ""} trabalhando
          </p>
        </div>
      )}

      {/* Footer: Status + ID */}
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
        <div className="flex items-center gap-2">
          <SapStatusBadge
            status={order.sap_sync_status}
            notificationNumber={order.sap_notification_number}
            syncMessage={order.sap_sync_message}
            compact
          />
          <span className="text-xs text-muted-foreground font-mono">
            #{order.id.slice(0, 8)}
          </span>
        </div>
      </div>
    </button>
  );
}
