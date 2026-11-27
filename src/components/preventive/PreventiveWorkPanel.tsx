import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Sector } from "@/hooks/useData";
import {
  PreventiveOrder,
  PreventiveWorkLog,
  formatEstimatedMinutes,
  resolvePreventiveWorkCenter,
} from "@/lib/preventiveOrders";
import { SapApontamento, buildApontamento, toSapDate, toSapTime } from "@/lib/sapFormat";
import { formatElapsedTime } from "@/lib/dateUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Clock, Loader2, Play, Plus, StopCircle, User, UserPlus, Users, X } from "lucide-react";
import { differenceInMinutes } from "date-fns";

interface StaffMember {
  id: string;
  name: string;
  registration_number: string;
  specialty: string;
}

interface PreventiveWorkPanelProps {
  order: PreventiveOrder;
  workLogs: PreventiveWorkLog[];
  sector?: Sector;
  onUpdate: () => void;
}

export function PreventiveWorkPanel({
  order,
  workLogs,
  sector,
  onUpdate,
}: PreventiveWorkPanelProps) {
  const { toast } = useToast();
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [stopNotes, setStopNotes] = useState<Record<string, string>>({});
  const [solutionText, setSolutionText] = useState("");
  const [partInput, setPartInput] = useState("");
  const [spareParts, setSpareParts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase
      .from("maintenance_staff")
      .select("id, name, registration_number, specialty")
      .eq("status", "active")
      .order("name")
      .then(({ data }) => {
        if (data) setStaffList(data);
      });
  }, []);

  const activeLogs = workLogs.filter((l) => l.ended_at === null);
  const finishedLogs = workLogs.filter((l) => l.ended_at !== null);
  const canExecute = order.status === "planned" || order.status === "in_progress";

  async function handleStartOrJoin() {
    const staff = staffList.find((s) => s.id === selectedStaffId);
    if (!staff) {
      toast({ title: "Selecione um técnico", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const now = new Date();
      const workCenter = resolvePreventiveWorkCenter(order.maintenance_type, sector, staff.specialty);

      const { error: logErr } = await supabase.from("preventive_work_logs").insert({
        order_id: order.id,
        technician_name: staff.name,
        technician_registry: staff.registration_number,
        work_center: workCenter,
        started_at: now.toISOString(),
      });
      if (logErr) throw logErr;

      if (order.status === "planned") {
        const { error: ordErr } = await supabase
          .from("preventive_backlog_orders")
          .update({
            status: "in_progress",
            started_at: order.started_at || now.toISOString(),
            start_date_sap: order.start_date_sap || toSapDate(now),
            start_time_sap: order.start_time_sap || toSapTime(now),
            technician_name: order.technician_name || staff.name,
            technician_registry: order.technician_registry || staff.registration_number,
          })
          .eq("id", order.id);
        if (ordErr) throw ordErr;
      }

      toast({ title: "Atividade iniciada", description: `${staff.name} entrou na equipe.` });
      setSelectedStaffId("");
      onUpdate();
    } catch (error: unknown) {
      const msg = error && typeof error === "object" && "message" in error ? String((error as { message: unknown }).message) : "Falha ao iniciar";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleStopTech(log: PreventiveWorkLog) {
    setLoading(true);
    try {
      const now = new Date();
      const mins = Math.max(0, differenceInMinutes(now, new Date(log.started_at)));
      const note = (stopNotes[log.id] || "").trim().slice(0, 2000);
      const { error } = await supabase
        .from("preventive_work_logs")
        .update({ ended_at: now.toISOString(), duration_minutes: mins, notes: note || null })
        .eq("id", log.id);
      if (error) throw error;
      toast({ title: "Apontamento encerrado", description: `${log.technician_name} registrou ${mins} min.` });
      onUpdate();
    } catch (error: unknown) {
      const msg = error && typeof error === "object" && "message" in error ? String((error as { message: unknown }).message) : "Falha";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleFinishOrder() {
    if (!solutionText.trim()) {
      toast({ title: "Descreva o serviço realizado", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const now = new Date();
      for (const log of activeLogs) {
        const mins = Math.max(0, differenceInMinutes(now, new Date(log.started_at)));
        await supabase
          .from("preventive_work_logs")
          .update({ ended_at: now.toISOString(), duration_minutes: mins })
          .eq("id", log.id);
      }

      const allLogs = [
        ...finishedLogs,
        ...activeLogs.map((l) => ({ ...l, ended_at: now.toISOString() })),
      ];
      const finalText = solutionText.trim();
      const apontamentos: SapApontamento[] = allLogs.map((l) =>
        buildApontamento(
          l.technician_registry || l.technician_name,
          l.work_center,
          new Date(l.started_at),
          new Date(l.ended_at || now.toISOString()),
          (l.notes || "").trim() || finalText
        )
      );
      const stepNotes = allLogs
        .filter((l) => (l.notes || "").trim())
        .map((l) => `${l.technician_name}: ${(l.notes || "").trim()}`);
      const consolidated = [...stepNotes, `Conclusão: ${finalText}`].join("\n");

      const { error } = await supabase
        .from("preventive_backlog_orders")
        .update({
          status: "completed",
          solution_description: consolidated,
          spare_parts_used: spareParts.length > 0 ? spareParts : null,
          started_at: order.started_at || now.toISOString(),
          start_date_sap: order.start_date_sap || toSapDate(now),
          start_time_sap: order.start_time_sap || toSapTime(now),
          finished_at: now.toISOString(),
          end_date_sap: toSapDate(now),
          end_time_sap: toSapTime(now),
          apontamentos: apontamentos as unknown as never,
          sap_sync_status: "Pending",
        })
        .eq("id", order.id);

      if (error) throw error;
      toast({
        title: "Atividade Concluída",
        description: "Ordem encerrada e liberada para integração no SAP.",
      });
      setSolutionText("");
      setSpareParts([]);
      onUpdate();
    } catch (error: unknown) {
      const msg = error && typeof error === "object" && "message" in error ? String((error as { message: unknown }).message) : "Falha";
      toast({ title: "Erro ao concluir", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  function addPart() {
    const p = partInput.trim();
    if (!p) return;
    setSpareParts((prev) => [...prev, p]);
    setPartInput("");
  }

  return (
    <div className="space-y-4">
      {/* Start / Join Team */}
      {canExecute && (
        <div className="industrial-card p-4 space-y-3">
          <Label className="font-semibold flex items-center gap-2">
            {order.status === "planned" ? <Play className="w-4 h-4 text-primary" /> : <UserPlus className="w-4 h-4 text-primary" />}
            {order.status === "planned" ? "Iniciar Execução" : "Adicionar Técnico à Equipe"}
          </Label>
          <div className="flex gap-2">
            <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
              <SelectTrigger className="flex-1"><SelectValue placeholder="Selecione o técnico..." /></SelectTrigger>
              <SelectContent>
                {staffList.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} ({s.registration_number})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleStartOrJoin} disabled={loading || !selectedStaffId}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : order.status === "planned" ? "Iniciar" : "Entrar"}
            </Button>
          </div>
        </div>
      )}

      {/* Active Team */}
      {activeLogs.length > 0 && (
        <div className="industrial-card p-4 space-y-3">
          <h4 className="font-semibold text-status-progress flex items-center gap-2 text-sm">
            <Users className="w-4 h-4" /> Equipe Ativa ({activeLogs.length})
          </h4>
          {activeLogs.map((log) => (
            <div key={log.id} className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-status-progress/10 border border-status-progress/30">
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{log.technician_name}</p>
                <p className="text-xs text-muted-foreground">
                  {log.technician_registry} · Centro: {log.work_center}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-status-progress flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {formatElapsedTime(log.started_at)}
                </span>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="outline" className="border-status-open text-status-open" disabled={loading}>
                      <StopCircle className="w-3.5 h-3.5 mr-1" /> Parar
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Encerrar apontamento</AlertDialogTitle>
                      <AlertDialogDescription>Registrar saída de {log.technician_name}?</AlertDialogDescription>
                    </AlertDialogHeader>
                    <Textarea
                      placeholder="O que foi feito até agora? (opcional)"
                      value={stopNotes[log.id] || ""}
                      onChange={(e) => setStopNotes((prev) => ({ ...prev, [log.id]: e.target.value }))}
                      rows={3}
                    />
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleStopTech(log)}>Confirmar</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Finish Order */}
      {order.status === "in_progress" && (
        <div className="industrial-card p-4 space-y-3 border-emerald-500/40">
          <h4 className="font-semibold text-emerald-400 flex items-center gap-2 text-sm">
            <CheckCircle className="w-4 h-4" /> Concluir Atividade (Dispara Envio ao SAP)
          </h4>
          <Textarea
            placeholder="Descreva o serviço executado na preventiva/melhoria *"
            value={solutionText}
            onChange={(e) => setSolutionText(e.target.value)}
            rows={3}
          />
          <div className="flex gap-2">
            <Input
              placeholder="Peça/material aplicado (opcional)"
              value={partInput}
              onChange={(e) => setPartInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addPart())}
            />
            <Button type="button" variant="outline" size="icon" onClick={addPart}><Plus className="w-4 h-4" /></Button>
          </div>
          {spareParts.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {spareParts.map((part, idx) => (
                <span key={`${part}-${idx}`} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-secondary text-xs">
                  {part}
                  <button type="button" onClick={() => setSpareParts((p) => p.filter((_, i) => i !== idx))}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleFinishOrder} disabled={loading || !solutionText.trim()}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Concluir e Liberar para SAP"}
          </Button>
        </div>
      )}

      {/* Work Log History */}
      {finishedLogs.length > 0 && (
        <div className="industrial-card p-4 space-y-2">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <User className="w-4 h-4 text-primary" /> Histórico de Apontamentos ({finishedLogs.length})
          </h4>
          {finishedLogs.map((log) => (
            <div key={log.id} className="text-xs p-2 rounded bg-muted/50 flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-foreground">{log.technician_name} ({log.work_center})</p>
                {log.notes && <p className="text-muted-foreground mt-0.5">{log.notes}</p>}
              </div>
              <span className="font-mono font-semibold shrink-0">{formatEstimatedMinutes(log.duration_minutes || 1)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}