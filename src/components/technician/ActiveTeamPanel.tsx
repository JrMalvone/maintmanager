import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { WorkLog } from "@/hooks/useWorkLogs";
import { formatElapsedTime } from "@/lib/dateUtils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { User, Clock, StopCircle, Loader2, Users } from "lucide-react";
import { differenceInMinutes } from "date-fns";

interface ActiveTeamPanelProps {
  workLogs: WorkLog[];
  orderId: string;
  onUpdate: () => void;
}

export function ActiveTeamPanel({ workLogs, orderId, onUpdate }: ActiveTeamPanelProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  const activeTechnicians = workLogs.filter((log) => log.ended_at === null);

  async function stopWorking(workLogId: string, techName: string) {
    setLoading(workLogId);

    try {
      const now = new Date();
      const workLog = workLogs.find((log) => log.id === workLogId);
      
      if (!workLog) throw new Error("Log não encontrado");

      const durationMinutes = differenceInMinutes(now, new Date(workLog.started_at));

      const { error } = await supabase
        .from("work_logs")
        .update({
          ended_at: now.toISOString(),
          duration_minutes: durationMinutes,
        })
        .eq("id", workLogId);

      if (error) throw error;

      toast({
        title: "Trabalho Encerrado",
        description: `${techName} registrou ${durationMinutes} minutos`,
      });

      onUpdate();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  }

  if (activeTechnicians.length === 0) {
    return (
      <div className="industrial-card p-4 border-dashed border-2 border-muted">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Users className="w-5 h-5" />
          <span className="text-sm">Nenhum técnico ativo no momento</span>
        </div>
      </div>
    );
  }

  return (
    <div className="industrial-card p-4">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-status-progress" />
        <h4 className="font-semibold text-status-progress">
          Equipe Ativa ({activeTechnicians.length})
        </h4>
      </div>

      <div className="space-y-3">
        {activeTechnicians.map((log) => (
          <div
            key={log.id}
            className="flex items-center justify-between p-3 rounded-lg bg-status-progress/10 border border-status-progress/30"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-status-progress/20 flex items-center justify-center">
                <User className="w-5 h-5 text-status-progress" />
              </div>
              <div>
                <p className="font-medium">{log.technician_name}</p>
                {log.technician_registry && (
                  <p className="text-xs text-muted-foreground">
                    {log.technician_registry}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="flex items-center gap-1 text-sm text-status-progress">
                  <Clock className="w-4 h-4" />
                  {formatElapsedTime(log.started_at)}
                </div>
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-status-open text-status-open hover:bg-status-open hover:text-white"
                    disabled={loading === log.id}
                  >
                    {loading === log.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <StopCircle className="w-4 h-4 mr-1" />
                        Parar
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Encerrar Trabalho</AlertDialogTitle>
                    <AlertDialogDescription>
                      Deseja registrar o fim do trabalho de{" "}
                      <strong>{log.technician_name}</strong>? O tempo será
                      calculado automaticamente.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => stopWorking(log.id, log.technician_name)}
                    >
                      Confirmar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
