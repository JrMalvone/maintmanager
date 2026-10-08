import type { WorkLog } from "@/hooks/useWorkLogs";
import type { ServiceOrder } from "@/hooks/useData";
import { User, Clock, CheckCircle, Timer, Wrench } from "lucide-react";
import { operatingMinutes } from "@/lib/operatingTime";

interface TechnicianPerformanceProps {
  workLogs: WorkLog[];
  orders: ServiceOrder[];
  shiftsByMachine?: Map<string, number>;
}

interface TechnicianStats {
  name: string;
  registry: string | null;
  sessionCount: number;
  totalMinutes: number;
  responseSum: number;
  repairSum: number;
  qualifiedCount: number;
}

const formatDuration = (minutes: number) => {
  const m = Math.round(minutes);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
};

export function TechnicianPerformance({ workLogs, orders, shiftsByMachine }: TechnicianPerformanceProps) {
  // Qualified orders: closed + machine stopped (same rule as the main KPIs)
  const qualified = new Map(
    orders
      .filter((o) => o.status === "closed" && o.is_machine_stopped && o.started_at && o.finished_at)
      .map((o) => [o.id, o])
  );
  const shiftsOf = (o: ServiceOrder) => (o.machine_id && shiftsByMachine?.get(o.machine_id)) || 3;

  const technicianMap = new Map<string, TechnicianStats>();
  // Per technician + order: first start and total operating repair minutes
  const perOrder = new Map<string, { tech: string; order: ServiceOrder; firstStart: string; repair: number }>();

  workLogs.forEach((log) => {
    if (log.duration_minutes === null) return;
    const name = log.technician_name;
    let t = technicianMap.get(name);
    if (!t) {
      t = { name, registry: log.technician_registry, sessionCount: 0, totalMinutes: 0, responseSum: 0, repairSum: 0, qualifiedCount: 0 };
      technicianMap.set(name, t);
    }
    t.sessionCount += 1;
    t.totalMinutes += log.duration_minutes || 0;

    const order = qualified.get(log.order_id);
    if (!order || !log.ended_at) return;
    const key = `${name}|${order.id}`;
    const repair = operatingMinutes(log.started_at, log.ended_at, shiftsOf(order));
    const entry = perOrder.get(key);
    if (entry) {
      entry.repair += repair;
      if (log.started_at < entry.firstStart) entry.firstStart = log.started_at;
    } else {
      perOrder.set(key, { tech: name, order, firstStart: log.started_at, repair });
    }
  });

  perOrder.forEach(({ tech, order, firstStart, repair }) => {
    const t = technicianMap.get(tech)!;
    t.qualifiedCount += 1;
    t.repairSum += repair;
    t.responseSum += operatingMinutes(order.created_at, firstStart, shiftsOf(order));
  });

  const technicianStats = Array.from(technicianMap.values()).sort((a, b) => b.totalMinutes - a.totalMinutes);
  if (technicianStats.length === 0) return null;

  const th = "py-3 px-4 text-sm font-medium text-muted-foreground text-center";

  return (
    <div className="industrial-card p-6">
      <h3 className="text-lg font-semibold mb-1">Desempenho dos Técnicos</h3>
      <p className="text-xs text-muted-foreground mb-4">
        Tempo para atendimento e de reparo consideram apenas ordens encerradas com máquina parada, dentro dos turnos.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className={`${th} text-left`}>Técnico</th>
              <th className={th}>Sessões</th>
              <th className={th}>Tempo Total</th>
              <th className={th}>Tempo Médio para Atendimento (MTTA)</th>
              <th className={th}>Tempo Médio de Reparo (MTTR)</th>
            </tr>
          </thead>
          <tbody>
            {technicianStats.map((tech, index) => (
              <tr key={tech.name} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <span className="font-medium">{tech.name}</span>
                      {tech.registry && <p className="text-xs text-muted-foreground">{tech.registry}</p>}
                    </div>
                    {index === 0 && (
                      <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">Top</span>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <CheckCircle className="w-4 h-4 text-status-closed" />
                    <span className="font-bold">{tech.sessionCount}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="font-bold">{formatDuration(tech.totalMinutes)}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Timer className="w-4 h-4 text-status-progress" />
                    <span className="font-bold">
                      {tech.qualifiedCount ? formatDuration(tech.responseSum / tech.qualifiedCount) : "—"}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Wrench className="w-4 h-4 text-primary" />
                    <span className="font-bold">
                      {tech.qualifiedCount ? formatDuration(tech.repairSum / tech.qualifiedCount) : "—"}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
