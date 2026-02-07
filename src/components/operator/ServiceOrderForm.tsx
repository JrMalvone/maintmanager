import { useState } from "react";
import { useSectors, useMachines } from "@/hooks/useData";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  Loader2,
  Send,
  AlertTriangle,
  CheckCircle,
  Zap,
  Settings,
} from "lucide-react";

type MaintenanceType = "electronic" | "mechanical";

export function ServiceOrderForm() {
  const { sectors, loading: sectorsLoading } = useSectors();
  const [selectedSector, setSelectedSector] = useState<string>("");
  const { machines, loading: machinesLoading } = useMachines(selectedSector);

  // Operator identification
  const [openerName, setOpenerName] = useState("");
  const [openerRegistry, setOpenerRegistry] = useState("");

  // Machine info
  const [machineId, setMachineId] = useState("");
  const [machineCode, setMachineCode] = useState("");
  const [isMachineStopped, setIsMachineStopped] = useState(false);

  // Defect info
  const [maintenanceType, setMaintenanceType] = useState<MaintenanceType>("mechanical");
  const [problemDescription, setProblemDescription] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!openerName.trim() || !openerRegistry.trim()) {
      toast({
        title: "Identificação obrigatória",
        description: "Informe seu nome e matrícula",
        variant: "destructive",
      });
      return;
    }

    if (!machineId) {
      toast({
        title: "Máquina obrigatória",
        description: "Selecione a máquina com defeito",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase.from("service_orders").insert({
        machine_id: machineId,
        problem_description: problemDescription.trim(),
        is_machine_stopped: isMachineStopped,
        priority: "medium",
        maintenance_type: maintenanceType,
        opener_name: openerName.trim(),
        opener_registry: openerRegistry.trim(),
      });

      if (error) throw error;

      toast({
        title: "Ordem de Serviço Criada",
        description: "Sua solicitação foi enviada para a equipe de manutenção",
      });

      // Reset form
      setMachineId("");
      setMachineCode("");
      setProblemDescription("");
      setIsMachineStopped(false);
      setMaintenanceType("mechanical");
      setSelectedSector("");
      // Keep operator info for convenience
    } catch (error: any) {
      toast({
        title: "Erro ao criar ordem",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  function handleMachineSelect(id: string) {
    setMachineId(id);
    const machine = machines.find((m) => m.id === id);
    if (machine) setMachineCode(machine.code);
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Nova Ordem de Serviço</h1>
        <p className="text-muted-foreground mt-2">
          Registre um problema de manutenção para sua máquina
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Operator Identification */}
        <div className="industrial-card p-6 space-y-4">
          <h2 className="font-semibold text-lg border-b border-border pb-2">
            Identificação do Operador
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="openerName">Nome do Operador *</Label>
              <Input
                id="openerName"
                type="text"
                placeholder="Seu nome completo"
                value={openerName}
                onChange={(e) => setOpenerName(e.target.value)}
                required
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="openerRegistry">Matrícula *</Label>
              <Input
                id="openerRegistry"
                type="text"
                placeholder="Número da matrícula"
                value={openerRegistry}
                onChange={(e) => setOpenerRegistry(e.target.value)}
                required
                className="h-12"
              />
            </div>
          </div>
        </div>

        {/* Machine Selection */}
        <div className="industrial-card p-6 space-y-4">
          <h2 className="font-semibold text-lg border-b border-border pb-2">
            Identificação da Máquina
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sector">Setor</Label>
              <Select
                value={selectedSector}
                onValueChange={setSelectedSector}
                disabled={sectorsLoading}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Selecione o setor" />
                </SelectTrigger>
                <SelectContent>
                  {sectors.map((sector) => (
                    <SelectItem key={sector.id} value={sector.id}>
                      {sector.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="machine">Máquina *</Label>
              <Select
                value={machineId}
                onValueChange={handleMachineSelect}
                disabled={!selectedSector || machinesLoading}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Selecione a máquina" />
                </SelectTrigger>
                <SelectContent>
                  {machines.map((machine) => (
                    <SelectItem key={machine.id} value={machine.id}>
                      {machine.code} - {machine.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {machineCode && (
            <p className="text-sm text-muted-foreground">
              Código selecionado:{" "}
              <span className="font-mono font-bold text-foreground">{machineCode}</span>
            </p>
          )}

          {/* Machine Status */}
          <div className="space-y-3">
            <Label>Status da Máquina</Label>
            <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/50">
              <div className="flex items-center gap-3">
                {isMachineStopped ? (
                  <AlertTriangle className="w-5 h-5 text-status-stopped" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-status-running" />
                )}
                <span className={isMachineStopped ? "machine-stopped" : "machine-running"}>
                  {isMachineStopped ? "Parada" : "Em Operação"}
                </span>
              </div>
              <Switch
                checked={isMachineStopped}
                onCheckedChange={setIsMachineStopped}
              />
            </div>
          </div>
        </div>

        {/* Defect Category */}
        <div className="industrial-card p-6 space-y-4">
          <h2 className="font-semibold text-lg border-b border-border pb-2">
            Categoria do Defeito
          </h2>

          <RadioGroup
            value={maintenanceType}
            onValueChange={(v) => setMaintenanceType(v as MaintenanceType)}
            className="grid grid-cols-2 gap-4"
          >
            <Label
              htmlFor="electronic"
              className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                maintenanceType === "electronic"
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-border hover:border-blue-500/50"
              }`}
            >
              <RadioGroupItem value="electronic" id="electronic" />
              <Zap className="w-5 h-5 text-blue-500" />
              <span className="font-medium">Elétrico</span>
            </Label>

            <Label
              htmlFor="mechanical"
              className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                maintenanceType === "mechanical"
                  ? "border-orange-500 bg-orange-500/10"
                  : "border-border hover:border-orange-500/50"
              }`}
            >
              <RadioGroupItem value="mechanical" id="mechanical" />
              <Settings className="w-5 h-5 text-orange-500" />
              <span className="font-medium">Mecânico</span>
            </Label>
          </RadioGroup>
        </div>

        {/* Problem Description */}
        <div className="industrial-card p-6 space-y-4">
          <h2 className="font-semibold text-lg border-b border-border pb-2">
            Descrição do Problema
          </h2>

          <div className="space-y-2">
            <Label htmlFor="problem">Descreva o defeito *</Label>
            <Textarea
              id="problem"
              placeholder="Descreva detalhadamente o problema encontrado na máquina..."
              value={problemDescription}
              onChange={(e) => setProblemDescription(e.target.value)}
              required
              className="min-h-[120px] resize-none"
            />
          </div>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          className="w-full h-14 text-lg btn-industrial"
          disabled={submitting || !machineId || !problemDescription.trim() || !openerName.trim() || !openerRegistry.trim()}
        >
          {submitting ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <>
              <Send className="w-5 h-5 mr-2" />
              Enviar Ordem de Serviço
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
