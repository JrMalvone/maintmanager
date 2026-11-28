import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "@/lib/dateUtils";
import {
  KANBAN_MOVEMENT_LABELS,
  KANBAN_ORDER_TYPE_LABELS,
  type KanbanMovement,
  type KanbanPart,
} from "@/lib/kanbanParts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowDownLeft, ArrowUpRight, History, Loader2, RotateCcw } from "lucide-react";

interface KanbanMovementsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  part: KanbanPart | null;
  machineDisplay: string;
}

export function KanbanMovementsDialog({
  open,
  onOpenChange,
  part,
  machineDisplay,
}: KanbanMovementsDialogProps) {
  const [movements, setMovements] = useState<KanbanMovement[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !part) return;
    let active = true;
    setLoading(true);
    supabase
      .from("kanban_movements")
      .select("*")
      .eq("part_id", part.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (!active) return;
        setMovements((data as KanbanMovement[]) || []);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, part]);

  if (!part) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            Histórico da Peça
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
          <p className="font-mono font-bold text-primary">{part.code}</p>
          <p className="font-medium">{part.description}</p>
          <p className="text-xs text-muted-foreground">
            {machineDisplay} · Saldo atual: {part.current_quantity} / {part.target_quantity}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Carregando movimentações...
            </div>
          ) : movements.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma movimentação registrada ainda.
            </p>
          ) : (
            movements.map((m) => {
              const isOut = m.movement_type === "consumption";
              const isRev = m.movement_type === "reversal";
              const Icon = isOut ? ArrowUpRight : isRev ? RotateCcw : ArrowDownLeft;
              return (
                <div
                  key={m.id}
                  className="rounded-lg border border-border bg-card p-3 flex items-start justify-between gap-3 text-sm"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1.5 font-medium">
                      <Icon className="w-4 h-4 shrink-0 text-primary" />
                      <span>{KANBAN_MOVEMENT_LABELS[m.movement_type]}</span>
                      {m.order_type && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {KANBAN_ORDER_TYPE_LABELS[m.order_type]}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(m.created_at)}
                      {m.actor_name ? ` · ${m.actor_name}` : ""}
                    </p>
                    {m.notes && <p className="text-xs text-muted-foreground">{m.notes}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono font-bold">
                      {isOut ? `-${m.quantity}` : `+${m.quantity}`}
                    </span>
                    <p className="text-xs text-muted-foreground font-mono">
                      {m.previous_quantity} → {m.new_quantity}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}