import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useOrderKanbanParts } from "@/hooks/useKanbanParts";
import { useAppAuth } from "@/hooks/useAppAuth";
import {
  KANBAN_CATEGORY_LABELS,
  KANBAN_TRAFFIC_LIGHT_LABELS,
  getActiveOrderConsumptions,
  getKanbanTrafficLight,
  type KanbanOrderType,
} from "@/lib/kanbanParts";
import { KanbanTrafficDot } from "./KanbanTrafficBadge";
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
import { useToast } from "@/hooks/use-toast";
import { Boxes, Loader2, Plus, Undo2 } from "lucide-react";
import { formatDateTime } from "@/lib/dateUtils";

interface OrderKanbanPartsPanelProps {
  orderId: string;
  orderType: KanbanOrderType;
  machineId: string | null;
  canEdit: boolean;
}

export function OrderKanbanPartsPanel({
  orderId,
  orderType,
  machineId,
  canEdit,
}: OrderKanbanPartsPanelProps) {
  const { user } = useAppAuth();
  const { toast } = useToast();
  const {
    machineParts,
    extraParts,
    orderMovements,
    loading,
    recordConsumption,
    reverseConsumption,
  } = useOrderKanbanParts(orderId, orderType, machineId);

  const [selectedPartId, setSelectedPartId] = useState("");
  const [qty, setQty] = useState("1");
  const [submitting, setSubmitting] = useState(false);
  const [reversingId, setReversingId] = useState<string | null>(null);

  const activeConsumptions = useMemo(
    () => getActiveOrderConsumptions(orderMovements),
    [orderMovements]
  );

  const partsMap = useMemo(
    () => new Map([...extraParts, ...machineParts].map((p) => [p.id, p])),
    [machineParts, extraParts]
  );

  const selectedPart = machineParts.find((part) => part.id === selectedPartId);

  const handleConsume = async () => {
    if (!selectedPart) {
      toast({ title: "Selecione uma peça do Kanban", variant: "destructive" });
      return;
    }
    const parsedQty = Number(qty);
    if (!Number.isInteger(parsedQty) || parsedQty < 1) {
      toast({ title: "Informe uma quantidade inteira maior que zero", variant: "destructive" });
      return;
    }
    if (parsedQty > selectedPart.current_quantity) {
      toast({
        title: "Saldo insuficiente no Kanban",
        description: `Disponível: ${selectedPart.current_quantity} unidade(s).`,
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const movement = await recordConsumption(
        selectedPart.id,
        parsedQty,
        user || "Manutenção"
      );
      const nextLight = getKanbanTrafficLight(movement.new_quantity, selectedPart.target_quantity);
      toast({
        title: `Peça baixada do Kanban (${selectedPart.code})`,
        description: `Saldo restante: ${movement.new_quantity}/${selectedPart.target_quantity} · ${KANBAN_TRAFFIC_LIGHT_LABELS[nextLight]}`,
      });
      setSelectedPartId("");
      setQty("1");
    } catch (err: any) {
      toast({
        title: "Não foi possível dar baixa na peça",
        description: err?.message || "Verifique o saldo disponível.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReverse = async (movementId: string) => {
    setReversingId(movementId);
    try {
      await reverseConsumption(movementId, user || "Manutenção");
      toast({ title: "Baixa estornada", description: "A quantidade foi devolvida ao Kanban." });
    } catch (err: any) {
      toast({
        title: "Erro ao estornar baixa",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setReversingId(null);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Boxes className="w-4 h-4 text-primary shrink-0" />
          <Label className="text-sm font-semibold">Peças do Kanban Utilizadas</Label>
        </div>
        {activeConsumptions.length > 0 && (
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-primary/15 text-primary">
            {activeConsumptions.reduce((sum, m) => sum + m.quantity, 0)} un
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Carregando peças do Kanban...
        </div>
      ) : (
        <>
          {canEdit && (
            machineParts.length === 0 ? (
              <div className="text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-2 rounded bg-muted/40 p-2.5">
                <span>
                  {machineId
                    ? "Nenhuma peça vinculada a este equipamento ou cadastrada como universal no Kanban deste setor."
                    : "Nenhuma peça universal disponível no Kanban do setor desta ordem."}
                </span>
                <Link to="/dashboard/kanban" className="text-primary hover:underline font-medium">
                  Cadastrar no Kanban
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_84px_auto] gap-2">
                  <Select value={selectedPartId} onValueChange={setSelectedPartId}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Selecione a peça do Kanban..." />
                    </SelectTrigger>
                    <SelectContent>
                      {machineParts.map((part) => {
                        const light = getKanbanTrafficLight(part.current_quantity, part.target_quantity);
                        return (
                          <SelectItem
                            key={part.id}
                            value={part.id}
                            disabled={part.current_quantity <= 0}
                          >
                            <span className="flex items-center gap-2">
                              <KanbanTrafficDot light={light} className="w-2 h-2" />
                              <span className="font-mono font-semibold">{part.code}</span>
                              <span className="truncate max-w-[190px]">{part.description}</span>
                              <span className="text-muted-foreground">
                                ({part.is_universal ? "Universal · " : ""}
                                {KANBAN_CATEGORY_LABELS[part.category]} · Saldo {part.current_quantity}/{part.target_quantity})
                              </span>
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>

                  <Input
                    type="number"
                    min={1}
                    max={selectedPart?.current_quantity || undefined}
                    step={1}
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    aria-label="Quantidade utilizada"
                    className="h-9 text-xs font-mono"
                  />

                  <Button
                    type="button"
                    size="sm"
                    onClick={handleConsume}
                    disabled={submitting || !selectedPartId}
                    className="h-9"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-1" />
                        Registrar uso
                      </>
                    )}
                  </Button>
                </div>
                {selectedPart && (
                  <p className="text-xs text-muted-foreground">
                    Disponível no Kanban: <strong>{selectedPart.current_quantity}</strong> de{" "}
                    {selectedPart.target_quantity} ({KANBAN_CATEGORY_LABELS[selectedPart.category]})
                  </p>
                )}
              </div>
            )
          )}

          {activeConsumptions.length > 0 ? (
            <div className="space-y-1.5 pt-1">
              {activeConsumptions.map((m) => {
                const part = partsMap.get(m.part_id);
                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        <span className="font-mono text-primary mr-1.5">
                          {part?.code || "Peça"}
                        </span>
                        {part?.description || "Peça removida do catálogo"}
                      </p>
                      <p className="text-muted-foreground">
                        {part ? `${KANBAN_CATEGORY_LABELS[part.category]} · ` : ""}
                        Qtd: <strong className="text-foreground">{m.quantity}</strong> ·{" "}
                        {formatDateTime(m.created_at)}
                      </p>
                    </div>
                    {canEdit && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive shrink-0"
                        disabled={reversingId === m.id}
                        onClick={() => handleReverse(m.id)}
                        title="Estornar baixa para o Kanban"
                      >
                        {reversingId === m.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <Undo2 className="w-3.5 h-3.5 mr-1" />
                            Estornar
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            !canEdit && (
              <p className="text-xs text-muted-foreground">
                Nenhuma peça do Kanban foi utilizada nesta ordem.
              </p>
            )
          )}
        </>
      )}
    </div>
  );
}