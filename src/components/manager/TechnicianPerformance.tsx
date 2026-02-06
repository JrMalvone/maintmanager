import type { ServiceOrder } from "@/hooks/useData";
import { differenceInMinutes } from "date-fns";
import { User, Clock, CheckCircle, Wrench } from "lucide-react";

interface TechnicianPerformanceProps {
  orders: ServiceOrder[];
}

interface TechnicianStats {
  name: string;
  registry: string | null;
  closedCount: number;
  avgTime: number;
}

export function TechnicianPerformance({ orders }: TechnicianPerformanceProps) {
  // Calculate stats per technician using technician_name field
  const closedOrders = orders.filter(
    (o) => o.status === "closed" && o.technician_name && o.started_at && o.finished_at
  );

  // Group by technician name
  const technicianMap = new Map<string, TechnicianStats>();

  closedOrders.forEach((order) => {
    const name = order.technician_name!;
    const existing = technicianMap.get(name);

    const repairTime = differenceInMinutes(
      new Date(order.finished_at!),
      new Date(order.started_at!)
    );

    if (existing) {
      existing.closedCount += 1;
      existing.avgTime = Math.round(
        (existing.avgTime * (existing.closedCount - 1) + repairTime) / existing.closedCount
      );
    } else {
      technicianMap.set(name, {
        name,
        registry: order.technician_registry,
        closedCount: 1,
        avgTime: repairTime,
      });
    }
  });

  const technicianStats = Array.from(technicianMap.values()).sort(
    (a, b) => b.closedCount - a.closedCount
  );

  if (technicianStats.length === 0) {
    return null;
  }

  return (
    <div className="industrial-card p-6">
      <h3 className="text-lg font-semibold mb-4">Desempenho dos Técnicos</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                Técnico
              </th>
              <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">
                Ordens Fechadas
              </th>
              <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">
                Tempo Médio
              </th>
            </tr>
          </thead>
          <tbody>
            {technicianStats.map((tech, index) => (
              <tr
                key={tech.name}
                className="border-b border-border/50 hover:bg-muted/50 transition-colors"
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <span className="font-medium">{tech.name}</span>
                      {tech.registry && (
                        <p className="text-xs text-muted-foreground">{tech.registry}</p>
                      )}
                    </div>
                    {index === 0 && (
                      <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                        Top
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <CheckCircle className="w-4 h-4 text-status-closed" />
                    <span className="font-bold">{tech.closedCount}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>
                      {tech.avgTime < 60
                        ? `${tech.avgTime} min`
                        : `${Math.floor(tech.avgTime / 60)}h ${tech.avgTime % 60}m`}
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
