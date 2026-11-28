import { useEffect, useState } from "react";
import {
  getKanbanMissingQuantity,
  type KanbanPart,
} from "@/lib/kanbanParts";
import { KanbanTrafficBadge } from "./KanbanTrafficBadge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, PackagePlus } from "lucide-react";

interface KanbanReplenishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  part: KanbanPart | null;
  machineDisplay: string;
  onConfirm: (partId: string, quantity: number, notes?: string) => Promise<void>;
}

export function KanbanReplenishDialog({
  open,
  onOpenChange,
  part,
  machineDisplay,
  onConfirm,
}: KanbanReplenishDialogProps) {
  const [receivedQty, setReceivedQty] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !part) return;
    const missing = getKanbanMissingQuantity(part.current_quantity, part.target_quantity);
    setReceivedQty(missing > 0 ? String(missing) : "");
    setNotes("");
    setError(null);
  }, [open, part]);

  if (!part) return null;

  const missing = getKanbanMissingQuantity(part.current_quantity, part.target_quantity);
  const parsedQty = Number(receivedQty);
  const validPreview = Number.isInteger(parsedQty) && parsedQty > 0;
  const nextQty = validPreview ? part.current_quantity + parsedQty : part.current_quantity;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!Number.isInteger(parsedQty) || parsedQty < 1) {
      setError("Digite a quantidade de peças recebidas (número inteiro maior que zero).");
      return;
    }
    setSaving(true);
    try {
      await onConfirm(part.id, parsedQty, notes.trim() || undefined);
      onOpenChange(false);
    } catch (err: any) {
      setError(err?.message || "Erro ao registrar reabastecimento.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus className="w-5 h-5 text-primary" />
            Reabastecer Kanban
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-1 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono font-bold text-primary">{part.code}</span>
              <KanbanTrafficBadge
                currentQuantity={part.current_quantity}
                targetQuantity={part.target_quantity}
                compact
              />
            </div>
            <p className="font-medium text-foreground">{part.description}</p>
            <p className="text-xs text-muted-foreground">Equipamento: {machineDisplay}</p>
            <div className="pt-2 mt-2 border-t border-border flex items-center justify-between text-xs">
              <span>
                Saldo atual: <strong className="text-foreground">{part.current_quantity}</strong> / {part.target_quantity}
              </span>
              {missing > 0 && (
                <span className="text-muted-foreground">
                  Faltam <strong className="text-foreground">{missing}</strong> para completar
                </span>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="replenish-qty">Quantas peças chegaram? *</Label>
            <Input
              id="replenish-qty"
              type="number"
              min={1}
              step={1}
              placeholder="Ex: 3"
              value={receivedQty}
              onChange={(e) => setReceivedQty(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="replenish-notes">Observação (opcional)</Label>
            <Input
              id="replenish-notes"
              placeholder="Ex: Requisição almoxarifado / NF 1234"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {validPreview && (
            <div className="rounded-lg border border-border bg-card p-3 flex items-center justify-between text-sm">
              <span>
                Novo saldo: <strong>{nextQty}</strong> / {part.target_quantity}
              </span>
              <KanbanTrafficBadge
                currentQuantity={nextQty}
                targetQuantity={part.target_quantity}
                compact
              />
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirmar Entrada
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}