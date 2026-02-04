import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { ServiceOrder, Machine } from "@/hooks/useData";
import { formatDateTime, calculateDuration } from "@/lib/dateUtils";
import { STATUS_LABELS, PRIORITY_LABELS } from "@/lib/constants";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Play,
  CheckCircle,
  Clock,
  AlertTriangle,
  Wrench,
  Plus,
  X,
} from "lucide-react";

interface OrderDetailSheetProps {
  order: ServiceOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function OrderDetailSheet({
  order,
  open,
  onOpenChange,
  onUpdate,
}: OrderDetailSheetProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [machine, setMachine] = useState<Machine | null>(null);
  const [loading, setLoading] = useState(false);
  const [solutionDescription, setSolutionDescription] = useState("");
  const [spareParts, setSpareParts] = useState<string[]>([]);
  const [newPart, setNewPart] = useState("");

  useEffect(() => {
    if (order?.machine_id) {
      fetchMachine(order.machine_id);
    }
  }, [order?.machine_id]);

  async function fetchMachine(machineId: string) {
    const { data } = await supabase
      .from("machines")
      .select("*")
      .eq("id", machineId)
      .maybeSingle();
    
    if (data) setMachine(data);
  }

  async function startMaintenance() {
    if (!order || !user) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from("service_orders")
        .update({
          status: "in_progress",
          technician_id: user.id,
          started_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      if (error) throw error;

      toast({
        title: "Manutenção Iniciada",
        description: "O serviço foi iniciado com sucesso",
      });

      onUpdate();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function closeOrder() {
    if (!order || !solutionDescription.trim()) {
      toast({
        title: "Descrição obrigatória",
        description: "Informe o que foi realizado",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from("service_orders")
        .update({
          status: "closed",
          solution_description: solutionDescription.trim(),
          spare_parts_used: spareParts.length > 0 ? spareParts : null,
          finished_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      if (error) throw error;

      toast({
        title: "Ordem Fechada",
        description: "O serviço foi concluído com sucesso",
      });

      onUpdate();
      onOpenChange(false);
      setSolutionDescription("");
      setSpareParts([]);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  function addSparePart() {
    if (newPart.trim()) {
      setSpareParts([...spareParts, newPart.trim()]);
      setNewPart("");
    }
  }

  function removeSparePart(index: number) {
    setSpareParts(spareParts.filter((_, i) => i !== index));
  }

  if (!order) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <span className={`status-badge-${order.status.replace("_", "")}`}>
              {STATUS_LABELS[order.status]}
            </span>
            <span className="text-muted-foreground font-mono text-sm">
              #{order.id.slice(0, 8)}
            </span>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Priority & Machine Status */}
          <div className="flex items-center gap-4">
            <span className={`priority-${order.priority}`}>
              {PRIORITY_LABELS[order.priority]}
            </span>
            {order.is_machine_stopped ? (
              <span className="machine-stopped">
                <AlertTriangle className="w-4 h-4" />
                Máquina Parada
              </span>
            ) : (
              <span className="machine-running">
                <CheckCircle className="w-4 h-4" />
                Em Operação
              </span>
            )}
          </div>

          <Separator />

          {/* Machine Info */}
          {machine && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">Máquina</Label>
              <div className="industrial-card p-3">
                <p className="font-mono font-bold text-lg">{machine.code}</p>
                <p className="text-sm text-muted-foreground">
                  {machine.model} - {machine.manufacturer}
                </p>
              </div>
            </div>
          )}

          {/* Problem Description */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Problema Reportado</Label>
            <p className="text-sm">{order.problem_description}</p>
          </div>

          {/* Timestamps */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <Label className="text-muted-foreground text-xs">Criado em</Label>
              <p className="flex items-center gap-1 mt-1">
                <Clock className="w-4 h-4" />
                {formatDateTime(order.created_at)}
              </p>
            </div>
            {order.started_at && (
              <div>
                <Label className="text-muted-foreground text-xs">Iniciado em</Label>
                <p className="flex items-center gap-1 mt-1">
                  <Play className="w-4 h-4" />
                  {formatDateTime(order.started_at)}
                </p>
              </div>
            )}
            {order.finished_at && (
              <div>
                <Label className="text-muted-foreground text-xs">Finalizado em</Label>
                <p className="flex items-center gap-1 mt-1">
                  <CheckCircle className="w-4 h-4" />
                  {formatDateTime(order.finished_at)}
                </p>
              </div>
            )}
            {order.started_at && order.finished_at && (
              <div>
                <Label className="text-muted-foreground text-xs">Duração</Label>
                <p className="flex items-center gap-1 mt-1 font-bold">
                  <Wrench className="w-4 h-4" />
                  {calculateDuration(order.started_at, order.finished_at)}
                </p>
              </div>
            )}
          </div>

          {/* Solution (if closed) */}
          {order.status === "closed" && order.solution_description && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-muted-foreground">Solução Aplicada</Label>
                <p className="text-sm">{order.solution_description}</p>
              </div>
              {order.spare_parts_used && order.spare_parts_used.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Peças Utilizadas</Label>
                  <ul className="list-disc list-inside text-sm">
                    {order.spare_parts_used.map((part, i) => (
                      <li key={i}>{part}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {/* Actions */}
          {order.status === "open" && (
            <>
              <Separator />
              <Button
                onClick={startMaintenance}
                className="w-full h-12 btn-industrial"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    Iniciar Manutenção
                  </>
                )}
              </Button>
            </>
          )}

          {order.status === "in_progress" && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="solution">O que foi realizado?</Label>
                  <Textarea
                    id="solution"
                    placeholder="Descreva a solução aplicada..."
                    value={solutionDescription}
                    onChange={(e) => setSolutionDescription(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Peças Utilizadas (opcional)</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nome da peça"
                      value={newPart}
                      onChange={(e) => setNewPart(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addSparePart()}
                    />
                    <Button type="button" variant="outline" size="icon" onClick={addSparePart}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {spareParts.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {spareParts.map((part, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded text-sm"
                        >
                          {part}
                          <button onClick={() => removeSparePart(i)}>
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  onClick={closeOrder}
                  className="w-full h-12 btn-industrial bg-status-closed hover:bg-status-closed/90"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Fechar Ordem
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
