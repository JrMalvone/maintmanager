import type { WorkLog } from "@/hooks/useWorkLogs";
import { formatDateTime } from "@/lib/dateUtils";
import { User, Clock, CheckCircle } from "lucide-react";
import { Label } from "@/components/ui/label";

interface WorkLogHistoryProps {
  workLogs: WorkLog[];
}

export function WorkLogHistory({ workLogs }: WorkLogHistoryProps) {
  const completedLogs = workLogs.filter((log) => log.ended_at !== null);

  if (completedLogs.length === 0) {
    return null;
  }

  const totalMinutes = completedLogs.reduce(
    (acc, log) => acc + (log.duration_minutes || 0),
    0
  );

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-muted-foreground">Histórico de Trabalho</Label>
        <span className="text-sm font-medium text-primary">
          Total: {formatDuration(totalMinutes)}
        </span>
      </div>

      <div className="space-y-2">
        {completedLogs.map((log) => (
          <div
            key={log.id}
            className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-status-closed/20 flex items-center justify-center">
                <User className="w-4 h-4 text-status-closed" />
              </div>
              <div>
                <p className="font-medium text-sm">{log.technician_name}</p>
                {log.technician_registry && (
                  <p className="text-xs text-muted-foreground">
                    {log.technician_registry}
                  </p>
                )}
              </div>
            </div>

            <div className="text-right">
              <div className="flex items-center gap-1 text-sm font-medium text-status-closed">
                <CheckCircle className="w-4 h-4" />
                {formatDuration(log.duration_minutes || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatDateTime(log.started_at).split(" ")[1]} -{" "}
                {log.ended_at ? formatDateTime(log.ended_at).split(" ")[1] : "-"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
