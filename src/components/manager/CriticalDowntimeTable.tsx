import type { ServiceOrder, Machine } from "@/hooks/useData";
import { formatDateTime } from "@/lib/dateUtils";
import { AlertTriangle, Clock } from "lucide-react";
import { useMemo } from "react";

interface CriticalDowntimeTableProps {
  orders: ServiceOrder[];
  machines: Machine[];
}

interface CriticalEvent {
  order: ServiceOrder;
  machineCode: string;
  sectorName: string;
  downtimeMinutes: number;
}

export function CriticalDowntimeTable({ orders, machines }: CriticalDowntimeTableProps) {
  const machineMap = useMemo(() => {
    const map = new Map<string, Machine>();
    machines.forEach((m) => map.set(m.id, m));
    return map;
  }, [machines]);

  const criticalEvents = useMemo(() => {
    const now = new Date();
    const events: CriticalEvent[] = [];

    for (const order of orders) {
      const start = new Date(order.created_at);
      const end = order.finished_at ? new Date(order.finished_at) : now;
      const downtimeMinutes = (end.getTime() - start.getTime()) / 60000;

      if (downtimeMinutes <= 180) continue;

      const machine = order.machine_id ? machineMap.get(order.machine_id) : null;

      events.push({
        order,
        machineCode: machine?.code ?? "—",
        sectorName: "—", // sector name resolved via machine
        downtimeMinutes,
      });
    }

    events.sort((a, b) => b.downtimeMinutes - a.downtimeMinutes);
    return events;
  }, [orders, machineMap]);

  function formatDuration(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return `${h}h ${m}min`;
  }

  if (criticalEvents.length === 0) {
    return null;
  }

  return (
    <div className="industrial-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-5 h-5 text-destructive" />
        <h3 className="text-lg font-semibold">Critical Downtimes (Over 3 Hours)</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Máquina</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Data Abertura</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Problema</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Tempo Parado</th>
            </tr>
          </thead>
          <tbody>
            {criticalEvents.map(({ order, machineCode, downtimeMinutes }) => (
              <tr key={order.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                <td className="py-3 px-4 text-sm font-medium">{machineCode}</td>
                <td className="py-3 px-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {formatDateTime(order.created_at)}
                  </div>
                </td>
                <td className="py-3 px-4 text-sm">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                    order.status === "closed"
                      ? "bg-emerald-500/10 text-emerald-500"
                      : order.status === "in_progress"
                      ? "bg-amber-500/10 text-amber-500"
                      : "bg-red-500/10 text-red-500"
                  }`}>
                    {order.status === "closed" ? "Fechada" : order.status === "in_progress" ? "Em Progresso" : "Aberta"}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm text-muted-foreground max-w-[200px] truncate">
                  {order.problem_description.length > 50
                    ? order.problem_description.slice(0, 50) + "…"
                    : order.problem_description}
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="font-bold text-destructive">{formatDuration(downtimeMinutes)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
