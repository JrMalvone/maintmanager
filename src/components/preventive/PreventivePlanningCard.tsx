import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import {
  PREVENTIVE_PRIORITY_LABELS,
  PreventiveOrder,
  PreventivePriority,
  canReleasePreventiveOrder,
  formatEstimatedMinutes,
  parseHoursMinutesToMinutes,
  validatePreventiveTransition,
} from "@/lib/preventiveOrders";
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
import { useToast } from "@/hooks/use-toast";
import {
  CalendarClock,
  CheckCircle2,
  Circle,
  Loader2,
  PackageCheck,
  ShoppingCart,
} from "lucide-react";
import { cn } from "@/lib/utils";

type MaterialChoice = "unset" | "yes" | "no";

interface PreventivePlanningCardProps {
  order: PreventiveOrder;
  onUpdate: () => void;
}

export function PreventivePlanningCard({ order, onUpdate }: PreventivePlanningCardProps) {
  const { toast } = useToast();
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [priority, setPriority] = useState<PreventivePriority>(order.priority);
  const [materialChoice, setMaterialChoice] = useState<MaterialChoice>("unset");
  const [partsExpectedDate, setPartsExpectedDate] = useState("");
  const [materialsNeeded, setMaterialsNeeded] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setHours(order.estimated_minutes ? String(Math.floor(order.estimated_minutes / 60)) : "");
    setMinutes(order.estimated_minutes ? String(order.estimated_minutes % 60) : "");
    setPriority(order.priority);
    setMaterialChoice(
      order.status === "waiting_parts" || order.has_materials === false
        ? "no"
        : order.has_materials === true
          ? "yes"
          : "unset"
    );
    setPartsExpectedDate(order.parts_expected_date || "");
    setMaterialsNeeded(order.materials_needed || "");
  }, [
    order.id,
    order.status,
    order.estimated_minutes,
    order.priority,
    order.has_materials,
    order.parts_expected_date,
    order.materials_needed,
  ]);

  const parsedEst = parseHoursMinutesToMinutes(hours, minutes);
  const validEstimate = parsedEst !== null && parsedEst > 0 ? parsedEst : null;
  const readyToRelease = canReleasePreventiveOrder(validEstimate, materialChoice === "yes");

  async function handleWaitForParts() {
    if (parsedEst === -1) {
      toast({
        title: "Tempo estimado inválido",
        description: "Informe horas >= 0 e minutos entre 0 e 59 (ou deixe em branco).",
        variant: "destructive",
      });
      return;
    }

    const check = validatePreventiveTransition({
      nextStatus: "waiting_parts",
      estimatedMinutes: validEstimate,
      hasMaterials: false,
      partsExpectedDate,
    });
    if (!check.ok) {
      toast({ title: "Prazo obrigatório", description: check.reason, variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("preventive_backlog_orders")
        .update({
          estimated_minutes: validEstimate,
          priority,
          has_materials: false,
          parts_expected_date: partsExpectedDate,
          materials_needed: materialsNeeded.trim() || null,
          status: "waiting_parts",
        })
        .eq("id", order.id);
      if (error) throw error;

      toast({
        title: "Aguardando Compra de Peças",
        description: `Previsão de chegada definida para ${format(parseISO(partsExpectedDate), "dd/MM/yyyy")}.`,
      });
      onUpdate();
    } catch (error: unknown) {
      const msg = error && typeof error === "object" && "message" in error ? String((error as { message: unknown }).message) : "Falha ao atualizar";
      toast({ title: "Erro ao salvar", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleRelease() {
    if (parsedEst === -1) {
      toast({
        title: "Tempo estimado inválido",
        description: "Informe horas inteiras >= 0 e minutos entre 0 e 59.",
        variant: "destructive",
      });
      return;
    }

    const check = validatePreventiveTransition({
      nextStatus: "planned",
      estimatedMinutes: validEstimate,
      hasMaterials: materialChoice === "yes",
      partsExpectedDate: null,
    });
    if (!check.ok) {
      toast({ title: "Requisitos para liberação", description: check.reason, variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("preventive_backlog_orders")
        .update({
          estimated_minutes: validEstimate,
          priority,
          has_materials: true,
          parts_expected_date: null,
          materials_needed: materialsNeeded.trim() || null,
          status: "planned",
          planned_at: order.planned_at || new Date().toISOString(),
        })
        .eq("id", order.id);
      if (error) throw error;

      toast({
        title: "Ordem Liberada para Execução",
        description: `Tempo previsto de ${formatEstimatedMinutes(validEstimate)} e material confirmado.`,
      });
      onUpdate();
    } catch (error: unknown) {
      const msg = error && typeof error === "object" && "message" in error ? String((error as { message: unknown }).message) : "Falha ao liberar";
      toast({ title: "Erro ao liberar", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className={cn(
        "industrial-card p-4 space-y-4",
        order.status === "waiting_parts"
          ? "border-status-open/60 bg-status-open/5"
          : "border-primary/50 bg-primary/5"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className={cn("font-semibold text-sm flex items-center gap-2", order.status === "waiting_parts" ? "text-status-open" : "text-primary")}>
          {order.status === "waiting_parts" ? (
            <>
              <ShoppingCart className="w-4 h-4" /> Aguardando Compra de Peças
            </>
          ) : (
            <>
              <CalendarClock className="w-4 h-4" /> Planejamento e Liberação
            </>
          )}
        </h3>
        {order.status === "waiting_parts" && order.parts_expected_date && (
          <span className="text-xs font-semibold text-foreground">
            Previsão: {format(parseISO(order.parts_expected_date), "dd/MM/yyyy")}
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label htmlFor="qHours" className="text-xs">Horas *</Label>
          <Input id="qHours" type="number" min={0} placeholder="0" value={hours} onChange={(e) => setHours(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="qMins" className="text-xs">Minutos *</Label>
          <Input id="qMins" type="number" min={0} max={59} placeholder="30" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Prioridade</Label>
          <Select value={priority} onValueChange={(v) => setPriority(v as PreventivePriority)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(PREVENTIVE_PRIORITY_LABELS) as PreventivePriority[]).map((p) => (
                <SelectItem key={p} value={p}>{PREVENTIVE_PRIORITY_LABELS[p]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold block">Há material disponível para executar a tarefa? *</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Button
            type="button"
            variant={materialChoice === "yes" ? "default" : "outline"}
            className={cn(
              "justify-start h-auto py-2.5 text-xs sm:text-sm",
              materialChoice === "yes" && "bg-status-closed hover:bg-status-closed/90 text-primary-foreground border-status-closed"
            )}
            onClick={() => setMaterialChoice("yes")}
          >
            <PackageCheck className="w-4 h-4 mr-2 shrink-0" />
            Sim, material disponível
          </Button>
          <Button
            type="button"
            variant={materialChoice === "no" ? "default" : "outline"}
            className={cn(
              "justify-start h-auto py-2.5 text-xs sm:text-sm",
              materialChoice === "no" && "bg-status-open hover:bg-status-open/90 text-primary-foreground border-status-open"
            )}
            onClick={() => setMaterialChoice("no")}
          >
            <ShoppingCart className="w-4 h-4 mr-2 shrink-0" />
            Não, precisa comprar peças
          </Button>
        </div>
      </div>

      {materialChoice === "no" ? (
        <div className="space-y-3 pt-2 border-t border-border">
          <div className="space-y-1">
            <Label htmlFor="partsExpectedDate" className="text-xs">Prazo previsto para chegada das peças *</Label>
            <Input
              id="partsExpectedDate"
              type="date"
              value={partsExpectedDate}
              onChange={(e) => setPartsExpectedDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="planMaterialsNeeded" className="text-xs">Peças / Materiais necessários</Label>
            <Textarea
              id="planMaterialsNeeded"
              rows={2}
              placeholder="Descreva as peças aguardando compra..."
              value={materialsNeeded}
              onChange={(e) => setMaterialsNeeded(e.target.value)}
            />
          </div>
          <Button
            type="button"
            className="w-full bg-status-open hover:bg-status-open/90 text-primary-foreground"
            disabled={saving || !partsExpectedDate}
            onClick={handleWaitForParts}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <ShoppingCart className="w-4 h-4 mr-1.5" />
                {order.status === "waiting_parts"
                  ? "Atualizar Aguardando Compra de Peças"
                  : "Mudar para Aguardando Compra de Peças"}
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="space-y-3 pt-2 border-t border-border">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <span className={cn("inline-flex items-center gap-1.5 font-medium", validEstimate ? "text-status-closed" : "text-muted-foreground")}>
              {validEstimate ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
              Tempo estipulado {validEstimate ? `(${formatEstimatedMinutes(validEstimate)})` : ""}
            </span>
            <span className={cn("inline-flex items-center gap-1.5 font-medium", materialChoice === "yes" ? "text-status-closed" : "text-muted-foreground")}>
              {materialChoice === "yes" ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
              Material confirmado
            </span>
          </div>
          <Button type="button" className="w-full" disabled={saving || !readyToRelease} onClick={handleRelease}>
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-1.5" /> Liberar para Execução
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}