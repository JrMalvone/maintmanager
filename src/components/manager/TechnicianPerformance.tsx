import type { WorkLog } from "@/hooks/useWorkLogs";
import { User, Clock, CheckCircle } from "lucide-react";

interface TechnicianPerformanceProps {
  workLogs: WorkLog[];
}

interface TechnicianStats {
  name: string;
  registry: string | null;
  sessionCount: number;
  totalMinutes: number;
}

export function TechnicianPerformance({ workLogs }: TechnicianPerformanceProps) {
  // Calculate stats per technician from work_logs
  const completedLogs = workLogs.filter((log) => log.duration_minutes !== null);

  // Group by technician name
  const technicianMap = new Map<string, TechnicianStats>();

  completedLogs.forEach((log) => {
    const name = log.technician_name;
    const existing = technicianMap.get(name);

    if (existing) {
      existing.sessionCount += 1;
      existing.totalMinutes += log.duration_minutes || 0;
    } else {
      technicianMap.set(name, {
        name,
        registry: log.technician_registry,
        sessionCount: 1,
        totalMinutes: log.duration_minutes || 0,
      });
    }
  });

  const technicianStats = Array.from(technicianMap.values()).sort(
    (a, b) => b.totalMinutes - a.totalMinutes
  );

  if (technicianStats.length === 0) {
    return null;
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

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
                Sessões de Trabalho
              </th>
              <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">
                Tempo Total Trabalhado
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
                    <span className="font-bold">{tech.sessionCount}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="font-bold">{formatDuration(tech.totalMinutes)}</span>
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
