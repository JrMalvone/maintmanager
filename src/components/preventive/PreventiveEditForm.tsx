import { useState } from "react";
import { PERIODICITIES, Periodicity } from "@/lib/preventiveSchedule";
import { supabase } from "@/integrations/supabase/client";
import type { Machine, Sector } from "@/hooks/useData";
import {
  PREVENTIVE_MAINTENANCE_LABELS,
  PREVENTIVE_ORDER_TYPE_LABELS,
  PREVENTIVE_PRIORITY_LABELS,
  PREVENTIVE_STATUS_LABELS,
  PreventiveMaintenanceType,
  PreventiveOrder,
  PreventiveOrderStatus,
  PreventiveOrderType,
  PreventivePriority,
  parseHoursMinutesToMinutes,
  resolvePreventiveWorkCenter,
  resolveSapSyncStatus,
  validatePreventiveTransition,
} from "@/lib/preventiveOrders";
import { toSapDate, toSapTime } from "@/lib/sapFormat";
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
import { Loader2, Save, X } from "lucide-react";

interface PreventiveEditFormProps {
  order: PreventiveOrder;
  sectors: Sector[];
  machines: Machine[];
  onSaved: () => void;
  onCancel: () => void;
}

export function PreventiveEditForm({
  order,
  sectors,
  machines,
  onSaved,
  onCancel,
}: PreventiveEditFormProps) {
  const { toast } = useToast();
  const [orderType, setOrderType] = useState<PreventiveOrderType>(order.order_type);
  const [periodicity, setPeriodicity] = useState<Periodicity>(order.periodicity || "once");
  const [scheduledDate, setScheduledDate] = useState(order.scheduled_date || "");
  const [status, setStatus] = useState<PreventiveOrderStatus>(order.status);
  const [priority, setPriority] = useState<PreventivePriority>(order.priority);
  const [maintenanceType, setMaintenanceType] = useState<PreventiveMaintenanceType>(order.maintenance_type);
  const [sectorId, setSectorId] = useState(order.sector_id || "");
  const [machineId, setMachineId] = useState(order.machine_id || "none");
  const [estHours, setEstHours] = useState(order.estimated_minutes ? String(Math.floor(order.estimated_minutes / 60)) : "");
  const [estMinutes, setEstMinutes] = useState(order.estimated_minutes ? String(order.estimated_minutes % 60) : "");
  const [hasMaterials, setHasMaterials] = useState<"unknown" | "yes" | "no">(
    order.has_materials === true ? "yes" : order.has_materials === false ? "no" : "unknown"
  );
  const [partsExpectedDate, setPartsExpectedDate] = useState(order.parts_expected_date || "");
  const [title, setTitle] = useState(order.title);
  const [description, setDescription] = useState(order.description);
  const [materialsNeeded, setMaterialsNeeded] = useState(order.materials_needed || "");
  const [openerName, setOpenerName] = useState(order.opener_name);
  const [openerRegistry, setOpenerRegistry] = useState(order.opener_registry);
  const [solutionDescription, setSolutionDescription] = useState(order.solution_description || "");
  const [saving, setSaving] = useState(false);

  const sectorMachines = sectorId ? machines.filter((m) => m.sector_id === sectorId) : machines;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !openerName.trim() || !openerRegistry.trim()) {
      toast({ title: "Campos obrigatórios", description: "Preencha título, descrição e solicitante.", variant: "destructive" });
      return;
    }

    const parsedEst = parseHoursMinutesToMinutes(estHours, estMinutes);
    if (parsedEst === -1) {
      toast({ title: "Tempo estimado inválido", description: "Informe horas inteiras >= 0 e minutos entre 0 e 59 (total > 0).", variant: "destructive" });
      return;
    }

    const effectiveHasMaterials =
      status === "waiting_parts"
        ? false
        : hasMaterials === "yes"
          ? true
          : hasMaterials === "no"
            ? false
            : null;
    const effectivePartsDate = status === "waiting_parts" ? partsExpectedDate || null : null;

    const transitionCheck = validatePreventiveTransition({
      nextStatus: status,
      estimatedMinutes: parsedEst,
      hasMaterials: effectiveHasMaterials,
      partsExpectedDate: effectivePartsDate,
    });
    if (!transitionCheck.ok) {
      toast({ title: "Validação de status", description: transitionCheck.reason, variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const finalStatus = status;
      const selectedMachine = machineId !== "none" ? machines.find((m) => m.id === machineId) : null;
      const effectiveSectorId = selectedMachine?.sector_id || sectorId || null;
      const sector = sectors.find((s) => s.id === effectiveSectorId);
      const workCenter = resolvePreventiveWorkCenter(maintenanceType, sector);
      const sapSyncStatus = resolveSapSyncStatus(
        finalStatus,
        order.sap_sync_status,
        order.sap_notification_number
      );

      const now = new Date();
      const payload: Record<string, unknown> = {
        order_type: orderType,
        periodicity: orderType === "preventive" ? periodicity : null,
        scheduled_date: scheduledDate || null,
        status: finalStatus,
        priority,
        maintenance_type: maintenanceType,
        sector_id: effectiveSectorId,
        machine_id: selectedMachine?.id ?? null,
        machine_number: selectedMachine?.code ?? null,
        estimated_minutes: parsedEst,
        has_materials: effectiveHasMaterials,
        parts_expected_date: effectivePartsDate,
        planned_at: finalStatus === "planned" && !order.planned_at ? now.toISOString() : order.planned_at,
        title: title.trim(),
        description: description.trim(),
        materials_needed: materialsNeeded.trim() || null,
        opener_name: openerName.trim(),
        opener_registry: openerRegistry.trim(),
        solution_description: solutionDescription.trim() || null,
        work_center: workCenter,
        sap_sync_status: sapSyncStatus,
      };

      if (finalStatus === "completed" && !order.finished_at) {
        payload["finished_at"] = now.toISOString();
        payload["end_date_sap"] = toSapDate(now);
        payload["end_time_sap"] = toSapTime(now);
      }

      const { error } = await supabase
        .from("preventive_backlog_orders")
        .update(payload)
        .eq("id", order.id);

      if (error) throw error;

      toast({
        title: "Ordem Atualizada",
        description:
          finalStatus !== order.status
            ? `Status atualizado para ${PREVENTIVE_STATUS_LABELS[finalStatus]}.`
            : "Alterações salvas com sucesso.",
      });
      onSaved();
    } catch (error: unknown) {
      const message =
        error && typeof error === "object" && "message" in error && typeof (error as { message: unknown }).message === "string"
          ? (error as { message: string }).message
          : "Erro ao salvar";
      toast({ title: "Erro ao salvar", description: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Classificação</Label>
          <Select value={orderType} onValueChange={(v) => setOrderType(v as PreventiveOrderType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(PREVENTIVE_ORDER_TYPE_LABELS) as PreventiveOrderType[]).map((k) => (
                <SelectItem key={k} value={k}>{PREVENTIVE_ORDER_TYPE_LABELS[k]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select
            value={status}
            onValueChange={(v) => {
              const next = v as PreventiveOrderStatus;
              setStatus(next);
              if (next === "waiting_parts") setHasMaterials("no");
            }}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(PREVENTIVE_STATUS_LABELS) as PreventiveOrderStatus[]).map((k) => (
                <SelectItem key={k} value={k}>{PREVENTIVE_STATUS_LABELS[k]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Prioridade</Label>
          <Select value={priority} onValueChange={(v) => setPriority(v as PreventivePriority)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(PREVENTIVE_PRIORITY_LABELS) as PreventivePriority[]).map((k) => (
                <SelectItem key={k} value={k}>{PREVENTIVE_PRIORITY_LABELS[k]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Tipo de Manutenção</Label>
          <Select value={maintenanceType} onValueChange={(v) => setMaintenanceType(v as PreventiveMaintenanceType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(PREVENTIVE_MAINTENANCE_LABELS) as PreventiveMaintenanceType[]).map((k) => (
                <SelectItem key={k} value={k}>{PREVENTIVE_MAINTENANCE_LABELS[k]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Setor</Label>
          <Select value={sectorId} onValueChange={(v) => { setSectorId(v); setMachineId("none"); }}>
            <SelectTrigger><SelectValue placeholder="Selecione o setor" /></SelectTrigger>
            <SelectContent>
              {sectors.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Máquina</Label>
          <Select value={machineId} onValueChange={setMachineId}>
            <SelectTrigger><SelectValue placeholder="Sem máquina específica" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem máquina específica</SelectItem>
              {sectorMachines.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.code}{m.model ? ` - ${m.model}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {orderType === "preventive" && <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label htmlFor="editPeriodicity">Periodicidade</Label>
          <Select value={periodicity} onValueChange={(v) => setPeriodicity(v as Periodicity)}><SelectTrigger id="editPeriodicity"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(PERIODICITIES).map(([key,item]) => <SelectItem key={key} value={key}>{item.label}</SelectItem>)}</SelectContent></Select>
        </div>
        <div className="space-y-1.5"><Label htmlFor="editScheduledDate">Data programada</Label><Input id="editScheduledDate" type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} /></div>
      </div>}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="editEstH">Tempo Estimado (Horas)</Label>
          <Input id="editEstH" type="number" min={0} placeholder="0" value={estHours} onChange={(e) => setEstHours(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="editEstM">Tempo Estimado (Min)</Label>
          <Input id="editEstM" type="number" min={0} max={59} placeholder="0" value={estMinutes} onChange={(e) => setEstMinutes(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Material Disponível</Label>
          <Select
            value={hasMaterials}
            onValueChange={(v) => {
              const val = v as "unknown" | "yes" | "no";
              setHasMaterials(val);
              if (val === "no" && status === "pending_planning") setStatus("waiting_parts");
            }}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="unknown">Não verificado</SelectItem>
              <SelectItem value="yes">Sim, material disponível</SelectItem>
              <SelectItem value="no">Não, precisa comprar peças</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {(status === "waiting_parts" || hasMaterials === "no") && (
          <div className="space-y-1.5">
            <Label htmlFor="editPartsExpectedDate">Prazo Chegada das Peças *</Label>
            <Input
              id="editPartsExpectedDate"
              type="date"
              value={partsExpectedDate}
              onChange={(e) => setPartsExpectedDate(e.target.value)}
            />
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="editTitle">Título *</Label>
        <Input id="editTitle" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} required />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="editDesc">Descrição *</Label>
        <Textarea id="editDesc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={2000} required />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="editMaterials">Peças / Materiais Necessários</Label>
        <Textarea id="editMaterials" value={materialsNeeded} onChange={(e) => setMaterialsNeeded(e.target.value)} rows={2} maxLength={1000} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="editOpener">Solicitante *</Label>
          <Input id="editOpener" value={openerName} onChange={(e) => setOpenerName(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="editRegistry">Matrícula *</Label>
          <Input id="editRegistry" value={openerRegistry} onChange={(e) => setOpenerRegistry(e.target.value)} required />
        </div>
      </div>

      {(status === "completed" || order.solution_description) && (
        <div className="space-y-1.5">
          <Label htmlFor="editSolution">Descrição da Execução / Conclusão</Label>
          <Textarea id="editSolution" value={solutionDescription} onChange={(e) => setSolutionDescription(e.target.value)} rows={3} />
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel} disabled={saving}>
          <X className="w-4 h-4 mr-1" /> Cancelar
        </Button>
        <Button type="submit" className="flex-1" disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-1" /> Salvar Alterações</>}
        </Button>
      </div>
    </form>
  );
}