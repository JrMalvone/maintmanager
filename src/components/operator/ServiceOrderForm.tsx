import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSectors, useMachines } from "@/hooks/useData";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  QrCode,
} from "lucide-react";
import { PRIORITY_LABELS, type PriorityLevel } from "@/lib/constants";

export function ServiceOrderForm() {
  const { user, profile } = useAuth();
  const { sectors, loading: sectorsLoading } = useSectors();
  const [selectedSector, setSelectedSector] = useState<string>("");
  const { machines, loading: machinesLoading } = useMachines(selectedSector);
  
  const [machineId, setMachineId] = useState("");
  const [machineCode, setMachineCode] = useState("");
  const [problemDescription, setProblemDescription] = useState("");
  const [isMachineStopped, setIsMachineStopped] = useState(false);
  const [priority, setPriority] = useState<PriorityLevel>("medium");
  const [submitting, setSubmitting] = useState(false);
  
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);

    try {
      const { error } = await supabase.from("service_orders").insert({
        machine_id: machineId || null,
        operator_id: user.id,
        problem_description: problemDescription.trim(),
        is_machine_stopped: isMachineStopped,
        priority,
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
      setPriority("medium");
      setSelectedSector("");
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
    const machine = machines.find(m => m.id === id);
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
        {/* Operator Info */}
        <div className="industrial-card p-6 space-y-4">
          <h2 className="font-semibold text-lg border-b border-border pb-2">
            Dados do Operador
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={profile?.name || ""} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Matrícula</Label>
              <Input
                value={profile?.registration_number || ""}
                disabled
                className="bg-muted"
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
              <Label htmlFor="machine">Máquina</Label>
              <div className="flex gap-2">
                <Select
                  value={machineId}
                  onValueChange={handleMachineSelect}
                  disabled={!selectedSector || machinesLoading}
                >
                  <SelectTrigger className="h-12 flex-1">
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
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-12 w-12"
                  title="Escanear QR Code"
                >
                  <QrCode className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>

          {machineCode && (
            <p className="text-sm text-muted-foreground">
              Código selecionado: <span className="font-mono font-bold text-foreground">{machineCode}</span>
            </p>
          )}
        </div>

        {/* Problem Details */}
        <div className="industrial-card p-6 space-y-4">
          <h2 className="font-semibold text-lg border-b border-border pb-2">
            Detalhes do Problema
          </h2>

          <div className="space-y-2">
            <Label htmlFor="problem">Descrição do Problema</Label>
            <Textarea
              id="problem"
              placeholder="Descreva o problema encontrado na máquina..."
              value={problemDescription}
              onChange={(e) => setProblemDescription(e.target.value)}
              required
              className="min-h-[120px] resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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

            {/* Priority */}
            <div className="space-y-3">
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as PriorityLevel)}>
                <SelectTrigger className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      <span className={`priority-${key}`}>{label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          className="w-full h-14 text-lg btn-industrial"
          disabled={submitting || !machineId || !problemDescription.trim()}
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
