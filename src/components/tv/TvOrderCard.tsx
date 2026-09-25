import { AlertTriangle, Clock3, Timer, UserRound, Wrench, Zap } from "lucide-react";
import { differenceInMinutes } from "date-fns";
import type { ServiceOrder } from "@/hooks/useData";
import type { Machine } from "@/hooks/useData";
import { machineLabel } from "@/lib/machineLabel";
import { cn } from "@/lib/utils";

interface TvOrderCardProps {
  order: ServiceOrder;
  machine?: Machine;
  team: string[];
  now: Date;
}

function elapsedLabel(createdAt: string, now: Date) {
  const total = Math.max(0, differenceInMinutes(now, new Date(createdAt)));
  const days = Math.floor(total / 1440);
  const hours = Math.floor((total % 1440) / 60);
  const minutes = total % 60;
  return days > 0
    ? `${days}d ${hours}h ${String(minutes).padStart(2, "0")}m`
    : `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

function elapsedClass(createdAt: string, now: Date) {
  const minutes = differenceInMinutes(now, new Date(createdAt));
  if (minutes > 1440) return "text-[hsl(var(--priority-critical))]";
  if (minutes > 120) return "text-[hsl(var(--priority-medium))]";
  return "text-[hsl(var(--status-closed))]";
}

export function TvOrderCard({ order, machine, team, now }: TvOrderCardProps) {
  const electronic = order.maintenance_type === "electronic";

  return (
    <article
      className={cn(
        "industrial-card min-h-[250px] p-5 flex flex-col",
        order.is_machine_stopped && "border-l-4 border-l-status-stopped"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-mono text-2xl font-bold leading-tight text-foreground break-words">
            {machineLabel(machine, order.machine_number ?? "Máquina não informada")}
          </h3>
        </div>
        {order.is_machine_stopped && (
          <span className="machine-stopped shrink-0" aria-label="Máquina parada">
            <AlertTriangle className="h-7 w-7" />
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded border px-2.5 py-1 text-sm font-bold",
            electronic
              ? "border-status-progress/40 bg-status-progress/15 text-status-progress"
              : "border-status-open/40 bg-status-open/15 text-status-open"
          )}
        >
          {electronic ? <Zap className="h-4 w-4" /> : <Wrench className="h-4 w-4" />}
          {electronic ? "Elétrico" : "Mecânico"}
        </span>
        <span className={order.status === "open" ? "status-badge-open" : "status-badge-progress"}>
          {order.status === "open" ? "Aberta" : "Em andamento"}
        </span>
      </div>

      <p className="mt-4 line-clamp-3 text-lg font-medium leading-snug text-foreground">
        {order.problem_description}
      </p>

      <div className="mt-auto border-t border-border pt-4 flex items-end justify-between gap-4">
        <div className="min-w-0 text-base text-muted-foreground">
          <div className="flex items-center gap-2">
            <UserRound className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {team.length > 0 ? team.join(", ") : "Aguardando técnico"}
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-2 text-sm">
            <Clock3 className="h-4 w-4 shrink-0" />
            Aberta às {new Date(order.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
        <div className={cn("flex shrink-0 items-center gap-2 font-mono text-3xl font-bold", elapsedClass(order.created_at, now))}>
          <Timer className="h-7 w-7" />
          {elapsedLabel(order.created_at, now)}
        </div>
      </div>
    </article>
  );
}