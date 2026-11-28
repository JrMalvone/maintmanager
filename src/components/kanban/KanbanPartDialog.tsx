import { useEffect, useMemo, useState } from "react";
import type { Machine, Sector } from "@/hooks/useData";
import type { KanbanPartInput } from "@/hooks/useKanbanParts";
import { KANBAN_CATEGORY_LABELS, type KanbanCategory, type KanbanPart } from "@/lib/kanbanParts";
import { machineLabel } from "@/lib/machineLabel";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface KanbanPartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  part: KanbanPart | null;
  sectors: Sector[];
  machines: Machine[];
  defaultSectorId?: string;
  defaultMachineId?: string;
  onSave: (input: KanbanPartInput, editingId?: string) => Promise<void>;
}

export function KanbanPartDialog({
  open,
  onOpenChange,
  part,
  sectors,
  machines,
  defaultSectorId,
  defaultMachineId,
  onSave,
}: KanbanPartDialogProps) {
  const [sectorId, setSectorId] = useState<string>("all");
  const [machineId, setMachineId] = useState<string>("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<KanbanCategory>("mechanical");
  const [targetQty, setTargetQty] = useState("2");
  const [currentQty, setCurrentQty] = useState("2");
  const [currentTouched, setCurrentTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (part) {
      const machine = machines.find((m) => m.id === part.machine_id);
      setSectorId(machine?.sector_id || "all");
      setMachineId(part.machine_id);
      setCode(part.code);
      setDescription(part.description);
      setCategory(part.category);
      setTargetQty(String(part.target_quantity));
      setCurrentQty(String(part.current_quantity));
      setCurrentTouched(true);
    } else {
      const initialMachine = defaultMachineId && defaultMachineId !== "all" ? defaultMachineId : "";
      const machineObj = machines.find((m) => m.id === initialMachine);
      setSectorId(
        machineObj?.sector_id || (defaultSectorId && defaultSectorId !== "all" ? defaultSectorId : "all")
      );
      setMachineId(initialMachine);
      setCode("");
      setDescription("");
      setCategory("mechanical");
      setTargetQty("2");
      setCurrentQty("2");
      setCurrentTouched(false);
    }
  }, [open, part, machines, defaultSectorId, defaultMachineId]);

  const filteredMachines = useMemo(() => {
    if (sectorId === "all") return machines;
    return machines.filter((m) => m.sector_id === sectorId);
  }, [machines, sectorId]);

  const handleSectorChange = (nextSector: string) => {
    setSectorId(nextSector);
    if (
      machineId &&
      nextSector !== "all" &&
      machines.find((m) => m.id === machineId)?.sector_id !== nextSector
    ) {
      setMachineId("");
    }
  };

  const handleTargetChange = (value: string) => {
    setTargetQty(value);
    if (!part && !currentTouched) {
      setCurrentQty(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsedTarget = Number(targetQty);
    const parsedCurrent = Number(currentQty);

    if (!machineId) {
      setError("Selecione o equipamento.");
      return;
    }
    if (!code.trim()) {
      setError("Informe o código da peça.");
      return;
    }
    if (!description.trim()) {
      setError("Informe a descrição da peça.");
      return;
    }
    if (!Number.isInteger(parsedTarget) || parsedTarget < 1) {
      setError("A quantidade estipulada no Kanban deve ser um número inteiro maior que zero.");
      return;
    }
    if (!Number.isInteger(parsedCurrent) || parsedCurrent < 0) {
      setError("A quantidade atual deve ser um número inteiro maior ou igual a zero.");
      return;
    }

    setSaving(true);
    try {
      await onSave(
        {
          machine_id: machineId,
          code: code.trim(),
          description: description.trim(),
          category,
          target_quantity: parsedTarget,
          current_quantity: parsedCurrent,
        },
        part?.id
      );
      onOpenChange(false);
    } catch (err: any) {
      setError(err?.message || "Erro ao salvar peça do Kanban.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{part ? "Editar Peça do Kanban" : "Nova Peça no Kanban"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="kanban-sector">Setor</Label>
              <Select value={sectorId} onValueChange={handleSectorChange}>
                <SelectTrigger id="kanban-sector">
                  <SelectValue placeholder="Todos os setores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os setores</SelectItem>
                  {sectors.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="kanban-machine">Equipamento *</Label>
              <Select value={machineId} onValueChange={setMachineId}>
                <SelectTrigger id="kanban-machine">
                  <SelectValue placeholder="Selecione o equipamento" />
                </SelectTrigger>
                <SelectContent>
                  {filteredMachines.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {machineLabel(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="kanban-code">Código da Peça *</Label>
              <Input
                id="kanban-code"
                placeholder="Ex: 004512-ROL"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="kanban-category">Tipo da Peça *</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as KanbanCategory)}>
                <SelectTrigger id="kanban-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mechanical">{KANBAN_CATEGORY_LABELS.mechanical}</SelectItem>
                  <SelectItem value="electronic">{KANBAN_CATEGORY_LABELS.electronic}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="kanban-description">Descrição da Peça *</Label>
            <Input
              id="kanban-description"
              placeholder="Ex: Rolamento rígido de esferas 6205-2RS"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="kanban-target">Qtd. Estipulada no Kanban *</Label>
              <Input
                id="kanban-target"
                type="number"
                min={1}
                step={1}
                value={targetQty}
                onChange={(e) => handleTargetChange(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="kanban-current">Saldo Atual no Kanban *</Label>
              <Input
                id="kanban-current"
                type="number"
                min={0}
                step={1}
                value={currentQty}
                onChange={(e) => {
                  setCurrentTouched(true);
                  setCurrentQty(e.target.value);
                }}
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {part ? "Salvar Alterações" : "Cadastrar Peça"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}