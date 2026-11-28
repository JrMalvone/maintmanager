import { useEffect, useState } from "react";
import { PERIODICITIES } from "@/lib/preventiveSchedule";
import { format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAppAuth } from "@/hooks/useAppAuth";
import { usePreventiveWorkLogs } from "@/hooks/usePreventiveOrders";
import type { Machine, Sector } from "@/hooks/useData";
import {
  PREVENTIVE_MAINTENANCE_LABELS,
  PREVENTIVE_ORDER_TYPE_LABELS,
  PREVENTIVE_PRIORITY_LABELS,
  PREVENTIVE_STATUS_LABELS,
  PreventiveOrder,
  PreventivePriority,
  formatEstimatedMinutes,
  getPreventiveOrderDelayInfo,
  parseHoursMinutesToMinutes,
} from "@/lib/preventiveOrders";
import { machineLabel } from "@/lib/machineLabel";
import { SapStatusBadge } from "@/components/shared/SapStatusBadge";
import { PreventiveEditForm } from "./PreventiveEditForm";
import { PreventiveWorkPanel } from "./PreventiveWorkPanel";
import { OrderKanbanPartsPanel } from "@/components/kanban/OrderKanbanPartsPanel";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { AlertTriangle, CalendarClock, CheckCircle2, Loader2, Package, Pencil, TimerOff, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PreventiveOrderDetailSheetProps {
  order: PreventiveOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectors: Sector[];
  machines: Machine[];
  onUpdate: () => void;
}

export function PreventiveOrderDetailSheet({
  order,
  open,
  onOpenChange,
  sectors,
  machines,
  onUpdate,
}: PreventiveOrderDetailSheetProps) {
  const { role } = useAppAuth();
  const { toast } = useToast();
  const { workLogs, refetch: refetchLogs } = usePreventiveWorkLogs(order?.id);
  const [editMode, setEditMode] = useState(false);
  const [planHours, setPlanHours] = useState("");
  const [planMinutes, setPlanMinutes] = useState("");
  const [planPriority, setPlanPriority] = useState<PreventivePriority>("medium");
  const [planning, setPlanning] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!open || order?.status !== "in_progress") return;
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, [open, order?.status, order?.id]);

  useEffect(() => {
    if (order) {
      setEditMode(false);
      setPlanHours(order.estimated_minutes ? String(Math.floor(order.estimated_minutes / 60)) : "");
      setPlanMinutes(order.estimated_minutes ? String(order.estimated_minutes % 60) : "");
      setPlanPriority(order.priority);
    }
  }, [order?.id]);

  useEffect(() => {
    if (order) {
      setPlanPriority(order.priority);
      if (order.estimated_minutes) {
        setPlanHours(String(Math.floor(order.estimated_minutes / 60)));
        setPlanMinutes(String(order.estimated_minutes % 60));
      }
    }
  }, [order?.estimated_minutes, order?.priority]);

  if (!order) return null;

  const machine = machines.find((m) => m.id === order.machine_id);
  const sector = sectors.find((s) => s.id === (order.sector_id || machine?.sector_id));
  const canEdit = role === "manutencao" || role === "gestor";
  const canDelete = role === "gestor";
  const delay = getPreventiveOrderDelayInfo(order, now);
  const durationText =
    delay.durationMinutes === null
      ? null
      : delay.durationMinutes === 0
        ? "< 1min"
        : formatEstimatedMinutes(delay.durationMinutes);

  async function handleQuickPlan(e: React.FormEvent) {
    e.preventDefault();
    if (!order) return;
    const mins = parseHoursMinutesToMinutes(planHours, planMinutes);
    if (!mins || mins <= 0) {
      toast({
        title: "Informe o tempo estimado",
        description: "Preencha horas e/ou minutos (total maior que 0).",
        variant: "destructive",
      });
      return;
    }
    setPlanning(true);
    try {
      const { error } = await supabase
        .from("preventive_backlog_orders")
        .update({
          estimated_minutes: mins,
          priority: planPriority,
          status: "planned",
          planned_at: new Date().toISOString(),
        })
        .eq("id", order.id);
      if (error) throw error;
      toast({
        title: "Tempo Estipulado",
        description: `Ordem planejada para ${formatEstimatedMinutes(mins)} e liberada para execução.`,
      });
      onUpdate();
    } catch (error: unknown) {
      const msg = error && typeof error === "object" && "message" in error ? String((error as { message: unknown }).message) : "Falha";
      toast({ title: "Erro ao planejar", description: msg, variant: "destructive" });
    } finally {
      setPlanning(false);
    }
  }

  async function handleDelete() {
    if (!order) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("preventive_backlog_orders").delete().eq("id", order.id);
      if (error) throw error;
      toast({ title: "Ordem excluída" });
      onOpenChange(false);
      onUpdate();
    } catch (error: unknown) {
      const msg = error && typeof error === "object" && "message" in error ? String((error as { message: unknown }).message) : "Falha";
      toast({ title: "Erro ao excluir", description: msg, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto space-y-5">
        <SheetHeader className="space-y-2 pr-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              <span className="status-badge bg-primary/15 text-primary border border-primary/40">
                {PREVENTIVE_ORDER_TYPE_LABELS[order.order_type]}
              </span>
              <span className="status-badge bg-secondary text-foreground border border-border">
                {PREVENTIVE_STATUS_LABELS[order.status]}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {canEdit && !editMode && (
                <Button size="sm" variant="outline" onClick={() => setEditMode(true)}>
                  <Pencil className="w-3.5 h-3.5 mr-1" /> Editar Tudo
                </Button>
              )}
              {canDelete && !editMode && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="icon" variant="ghost" className="text-destructive h-8 w-8" disabled={deleting}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir ordem?</AlertDialogTitle>
                      <AlertDialogDescription>Essa ação remove a ordem e seus apontamentos permanentemente.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
          <SheetTitle className="text-left text-xl leading-snug">{order.title}</SheetTitle>
        </SheetHeader>

        {editMode ? (
          <PreventiveEditForm
            order={order}
            sectors={sectors}
            machines={machines}
            onSaved={() => {
              setEditMode(false);
              onUpdate();
            }}
            onCancel={() => setEditMode(false)}
          />
        ) : (
          <div className="space-y-4">
            {/* Quick Planning Card when awaiting planning */}
            {order.status === "pending_planning" && canEdit && (
              <form onSubmit={handleQuickPlan} className="industrial-card p-4 border-primary/50 bg-primary/5 space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2 text-primary">
                  <CalendarClock className="w-4 h-4" /> Planejar Tempo e Prioridade (Reunião)
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="qHours" className="text-xs">Horas</Label>
                    <Input id="qHours" type="number" min={0} placeholder="0" value={planHours} onChange={(e) => setPlanHours(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="qMins" className="text-xs">Minutos</Label>
                    <Input id="qMins" type="number" min={0} max={59} placeholder="30" value={planMinutes} onChange={(e) => setPlanMinutes(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Prioridade</Label>
                    <Select value={planPriority} onValueChange={(v) => setPlanPriority(v as PreventivePriority)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(PREVENTIVE_PRIORITY_LABELS) as PreventivePriority[]).map((p) => (
                          <SelectItem key={p} value={p}>{PREVENTIVE_PRIORITY_LABELS[p]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={planning}>
                  {planning ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4 mr-1.5" /> Estipular Tempo e Liberar Execução</>}
                </Button>
              </form>
            )}

            {/* Core details */}
            {(delay.isDateOverdue || delay.isTimeExceeded) && (
              <div
                className={cn(
                  "rounded-lg border p-3 space-y-1.5 text-xs",
                  delay.isDateOverdue || order.status === "in_progress"
                    ? "border-destructive/50 bg-destructive/10"
                    : "border-status-open/50 bg-status-open/10"
                )}
              >
                {delay.isDateOverdue && order.scheduled_date && (
                  <p className="flex items-center gap-2 font-semibold text-destructive">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    Data planejada vencida há {delay.daysOverdue} dia(s) (prevista para {format(parseISO(order.scheduled_date), "dd/MM/yyyy")}).
                  </p>
                )}
                {delay.isTimeExceeded && order.estimated_minutes && durationText && (
                  <p className={cn("flex items-center gap-2 font-semibold", order.status === "in_progress" ? "text-destructive" : "text-status-open")}>
                    <TimerOff className="w-4 h-4 shrink-0" />
                    Tempo estipulado ultrapassado em +{formatEstimatedMinutes(delay.overtimeMinutes)} (previsto {formatEstimatedMinutes(order.estimated_minutes)} · {order.status === "completed" ? "real" : "decorrido"} {durationText} · {delay.percentOfEstimate}%).
                  </p>
                )}
              </div>
            )}
            {order.scheduled_date && <div className="border-y border-border py-3 text-sm flex flex-wrap justify-between gap-2"><span>Programada: <strong>{format(parseISO(order.scheduled_date), "dd/MM/yyyy")}</strong></span><span>{order.periodicity ? PERIODICITIES[order.periodicity].label : "Única"}</span></div>}
            <div className="industrial-card p-4 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xs text-muted-foreground block">Setor</span>
                  <span className="font-semibold">{sector?.name || "—"}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Equipamento</span>
                  <span className="font-mono font-semibold">{machine ? machineLabel(machine) : order.machine_number || "Geral do setor"}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Tipo de Manutenção</span>
                  <span className="font-semibold">{PREVENTIVE_MAINTENANCE_LABELS[order.maintenance_type]}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Prioridade</span>
                  <span className="font-semibold">{PREVENTIVE_PRIORITY_LABELS[order.priority]}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Tempo Estimado</span>
                  <span className="font-semibold text-primary">{formatEstimatedMinutes(order.estimated_minutes)}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Solicitante</span>
                  <span className="font-semibold">{order.opener_name} ({order.opener_registry})</span>
                </div>
              </div>

              {order.estimated_minutes && durationText && delay.percentOfEstimate !== null && (
                <div className="pt-2 border-t border-border space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-muted-foreground font-medium">Aderência ao Tempo Estipulado</span>
                    <span
                      className={cn(
                        "font-semibold",
                        delay.isTimeExceeded
                          ? order.status === "in_progress"
                            ? "text-destructive"
                            : "text-status-open"
                          : order.status === "completed"
                            ? "text-status-closed"
                            : "text-status-progress"
                      )}
                    >
                      {order.status === "completed" ? "Real" : "Decorrido"}: {durationText} / {formatEstimatedMinutes(order.estimated_minutes)} ({delay.percentOfEstimate}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        delay.isTimeExceeded
                          ? order.status === "in_progress"
                            ? "bg-destructive"
                            : "bg-status-open"
                          : order.status === "completed"
                            ? "bg-status-closed"
                            : "bg-status-progress"
                      )}
                      style={{ width: `${Math.min(100, delay.percentOfEstimate)}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-border">
                <span className="text-xs text-muted-foreground block mb-1">Descrição da Atividade</span>
                <p className="whitespace-pre-wrap text-foreground">{order.description}</p>
              </div>

              {order.materials_needed && (
                <div className="pt-2 border-t border-border">
                  <span className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                    <Package className="w-3.5 h-3.5" /> Peças / Materiais Necessários
                  </span>
                  <p className="whitespace-pre-wrap text-foreground">{order.materials_needed}</p>
                </div>
              )}

              {order.solution_description && (
                <div className="pt-2 border-t border-border">
                  <span className="text-xs text-emerald-400 block mb-1">Serviço Realizado</span>
                  <p className="whitespace-pre-wrap text-foreground">{order.solution_description}</p>
                </div>
              )}

              <div className="pt-2 border-t border-border flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">Integração SAP</span>
                {order.status === "completed" ? (
                  <SapStatusBadge
                    status={order.sap_sync_status}
                    notificationNumber={order.sap_notification_number}
                    syncMessage={order.sap_sync_message}
                  />
                ) : (
                  <span className="text-xs text-muted-foreground">Lançamento no SAP somente ao concluir</span>
                )}
              </div>
            </div>

            {/* Technician Execution & Work Logs */}
            <PreventiveWorkPanel
              order={order}
              workLogs={workLogs}
              sector={sector}
              onUpdate={() => {
                refetchLogs();
                onUpdate();
              }}
            />

            {/* Kanban Parts Consumption */}
            <OrderKanbanPartsPanel
              orderId={order.id}
              orderType={order.order_type}
              machineId={order.machine_id}
              canEdit={order.status !== "completed" && order.status !== "canceled"}
            />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}