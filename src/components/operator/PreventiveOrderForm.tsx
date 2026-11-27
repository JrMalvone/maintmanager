import { useState } from "react";
import { z } from "zod";
import { useSectors, useMachines } from "@/hooks/useData";
import { supabase } from "@/integrations/supabase/client";
import {
  PreventiveMaintenanceType,
  PreventiveOrderType,
  resolvePreventiveWorkCenter,
} from "@/lib/preventiveOrders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  CalendarCheck,
  Hammer,
  Lightbulb,
  Loader2,
  Send,
  Settings,
  ShoppingCart,
  Zap,
} from "lucide-react";

const schema = z.object({
  orderType: z.enum(["preventive", "backlog"]),
  openerName: z.string().min(2, "Informe o nome completo (mín. 2 caracteres)").max(120),
  openerRegistry: z.string().min(1, "Informe a matrícula").max(40),
  maintenanceType: z.enum(["electronic", "mechanical", "metalwork", "parts_purchase"]),
  title: z.string().min(3, "Informe um título resumido (mín. 3 caracteres)").max(160),
  description: z.string().min(5, "Descreva a atividade com pelo menos 5 caracteres").max(2000),
});

export function PreventiveOrderForm() {
  const { sectors, loading: sectorsLoading } = useSectors();
  const [selectedSector, setSelectedSector] = useState("");
  const { machines, loading: machinesLoading } = useMachines(selectedSector);

  const [orderType, setOrderType] = useState<PreventiveOrderType>("preventive");
  const [openerName, setOpenerName] = useState("");
  const [openerRegistry, setOpenerRegistry] = useState("");
  const [machineId, setMachineId] = useState("");
  const [maintenanceType, setMaintenanceType] = useState<PreventiveMaintenanceType | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [materialsNeeded, setMaterialsNeeded] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  function handleSectorChange(sectorId: string) {
    setSelectedSector(sectorId);
    setMachineId("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSector) {
      toast({ title: "Setor obrigatório", description: "Selecione o setor da atividade", variant: "destructive" });
      return;
    }
    if (!maintenanceType) {
      toast({ title: "Tipo de manutenção obrigatório", description: "Escolha a área responsável", variant: "destructive" });
      return;
    }

    const parsed = schema.safeParse({
      orderType,
      openerName: openerName.trim(),
      openerRegistry: openerRegistry.trim(),
      maintenanceType,
      title: title.trim(),
      description: description.trim(),
    });

    if (!parsed.success) {
      toast({ title: "Dados inválidos", description: parsed.error.issues[0]?.message, variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const machine = machines.find((m) => m.id === machineId);
      const sector = sectors.find((s) => s.id === selectedSector);
      const workCenter = resolvePreventiveWorkCenter(maintenanceType, sector);

      const { error } = await supabase.from("preventive_backlog_orders").insert({
        order_type: orderType,
        status: "pending_planning",
        priority: "medium",
        maintenance_type: maintenanceType,
        machine_id: machine?.id ?? null,
        machine_number: machine?.code ?? null,
        sector_id: selectedSector,
        title: title.trim(),
        description: description.trim(),
        materials_needed: materialsNeeded.trim() || null,
        opener_name: openerName.trim(),
        opener_registry: openerRegistry.trim(),
        work_center: workCenter,
        sap_sync_status: "NotApplicable",
      });

      if (error) throw error;

      toast({
        title: orderType === "preventive" ? "Preventiva Registrada" : "Melhoria (Backlog) Registrada",
        description: "Enviada para Aguardando Planejamento de tempo e prioridade.",
      });

      setSelectedSector("");
      setMachineId("");
      setMaintenanceType(null);
      setTitle("");
      setDescription("");
      setMaterialsNeeded("");
    } catch (error: unknown) {
      const message =
        error && typeof error === "object" && "message" in error && typeof (error as { message: unknown }).message === "string"
          ? (error as { message: string }).message
          : "Erro inesperado";
      toast({ title: "Erro ao criar ordem", description: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  const selectedMachine = machines.find((m) => m.id === machineId);

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Nova Preventiva / Backlog</h1>
        <p className="text-muted-foreground mt-1">
          Cadastre uma manutenção preventiva ou melhoria para planejamento em reunião
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Type: Preventive vs Backlog */}
        <div className="industrial-card p-6 space-y-4">
          <h2 className="font-semibold text-lg border-b border-border pb-2">Classificação da Ordem *</h2>
          <RadioGroup
            value={orderType}
            onValueChange={(v) => setOrderType(v as PreventiveOrderType)}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            <Label
              htmlFor="type-preventive"
              className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                orderType === "preventive" ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
              }`}
            >
              <RadioGroupItem value="preventive" id="type-preventive" />
              <CalendarCheck className="w-5 h-5 text-primary shrink-0" />
              <div>
                <span className="font-semibold block">Preventiva</span>
                <span className="text-xs text-muted-foreground">Inspeção, lubrificação ou plano periódico</span>
              </div>
            </Label>

            <Label
              htmlFor="type-backlog"
              className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                orderType === "backlog" ? "border-amber-500 bg-amber-500/10" : "border-border hover:border-amber-500/50"
              }`}
            >
              <RadioGroupItem value="backlog" id="type-backlog" />
              <Lightbulb className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <span className="font-semibold block">Backlog (Melhoria)</span>
                <span className="text-xs text-muted-foreground">Adequação, kaizen ou melhoria técnica</span>
              </div>
            </Label>
          </RadioGroup>
        </div>

        {/* Requester Identification */}
        <div className="industrial-card p-6 space-y-4">
          <h2 className="font-semibold text-lg border-b border-border pb-2">Identificação do Solicitante</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prevOpenerName">Nome *</Label>
              <Input
                id="prevOpenerName"
                placeholder="Seu nome completo"
                value={openerName}
                onChange={(e) => setOpenerName(e.target.value)}
                required
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prevOpenerRegistry">Matrícula *</Label>
              <Input
                id="prevOpenerRegistry"
                placeholder="Número da matrícula"
                value={openerRegistry}
                onChange={(e) => setOpenerRegistry(e.target.value)}
                required
                className="h-12"
              />
            </div>
          </div>
        </div>

        {/* Sector & Machine */}
        <div className="industrial-card p-6 space-y-4">
          <h2 className="font-semibold text-lg border-b border-border pb-2">Setor e Equipamento</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Setor *</Label>
              <Select value={selectedSector} onValueChange={handleSectorChange} disabled={sectorsLoading}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Selecione o setor" />
                </SelectTrigger>
                <SelectContent>
                  {sectors.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Máquina <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              <Select value={machineId} onValueChange={setMachineId} disabled={!selectedSector || machinesLoading}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Selecione a máquina" />
                </SelectTrigger>
                <SelectContent>
                  {machines.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.code}{m.model ? ` - ${m.model}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {selectedMachine && (
            <p className="text-sm text-muted-foreground">
              Código selecionado: <span className="font-mono font-bold text-foreground">{selectedMachine.code}</span>
            </p>
          )}
        </div>

        {/* Maintenance Type (4 options) */}
        <div className="industrial-card p-6 space-y-4">
          <h2 className="font-semibold text-lg border-b border-border pb-2">Tipo de Manutenção *</h2>
          <RadioGroup
            value={maintenanceType ?? ""}
            onValueChange={(v) => setMaintenanceType(v as PreventiveMaintenanceType)}
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
            <Label
              htmlFor="pm-electronic"
              className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                maintenanceType === "electronic" ? "border-blue-500 bg-blue-500/10" : "border-border hover:border-blue-500/50"
              }`}
            >
              <RadioGroupItem value="electronic" id="pm-electronic" />
              <Zap className="w-5 h-5 text-blue-400" />
              <span className="font-medium">Elétrica</span>
            </Label>

            <Label
              htmlFor="pm-mechanical"
              className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                maintenanceType === "mechanical" ? "border-orange-500 bg-orange-500/10" : "border-border hover:border-orange-500/50"
              }`}
            >
              <RadioGroupItem value="mechanical" id="pm-mechanical" />
              <Settings className="w-5 h-5 text-orange-400" />
              <span className="font-medium">Mecânica</span>
            </Label>

            <Label
              htmlFor="pm-metalwork"
              className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                maintenanceType === "metalwork" ? "border-purple-500 bg-purple-500/10" : "border-border hover:border-purple-500/50"
              }`}
            >
              <RadioGroupItem value="metalwork" id="pm-metalwork" />
              <Hammer className="w-5 h-5 text-purple-400" />
              <span className="font-medium">Serralheria</span>
            </Label>

            <Label
              htmlFor="pm-parts"
              className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                maintenanceType === "parts_purchase" ? "border-emerald-500 bg-emerald-500/10" : "border-border hover:border-emerald-500/50"
              }`}
            >
              <RadioGroupItem value="parts_purchase" id="pm-parts" />
              <ShoppingCart className="w-5 h-5 text-emerald-400" />
              <span className="font-medium">Compra de Peças</span>
            </Label>
          </RadioGroup>
        </div>

        {/* Title, Description & Materials */}
        <div className="industrial-card p-6 space-y-4">
          <h2 className="font-semibold text-lg border-b border-border pb-2">Detalhes da Atividade</h2>
          <div className="space-y-2">
            <Label htmlFor="prevTitle">Título resumido *</Label>
            <Input
              id="prevTitle"
              placeholder="Ex: Troca preventiva de correias / Proteção acrílica na esteira"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={160}
              className="h-12"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prevDesc">Descrição da atividade *</Label>
            <Textarea
              id="prevDesc"
              placeholder="Detalhe o serviço preventivo ou a melhoria desejada..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              maxLength={2000}
              className="min-h-[110px] resize-none"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prevMaterials">
              Peças / Materiais necessários <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Textarea
              id="prevMaterials"
              placeholder="Liste peças, medidas ou códigos de material (se aplicável)..."
              value={materialsNeeded}
              onChange={(e) => setMaterialsNeeded(e.target.value)}
              maxLength={1000}
              className="min-h-[70px] resize-none"
            />
          </div>
        </div>

        <Button
          type="submit"
          className="w-full h-14 text-lg btn-industrial"
          disabled={
            submitting ||
            !selectedSector ||
            !maintenanceType ||
            !title.trim() ||
            !description.trim() ||
            !openerName.trim() ||
            !openerRegistry.trim()
          }
        >
          {submitting ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <>
              <Send className="w-5 h-5 mr-2" />
              Registrar {orderType === "preventive" ? "Preventiva" : "Backlog"}
            </>
          )}
        </Button>
      </form>
    </div>
  );
}