import { useEffect, useState } from "react";
import type { Sector } from "@/hooks/useData";
import type { KanbanCabinetInput } from "@/hooks/useKanbanParts";
import type { KanbanCabinet } from "@/lib/kanbanParts";
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
import { Archive, Loader2 } from "lucide-react";

interface KanbanCabinetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cabinet: KanbanCabinet | null;
  hasParts?: boolean;
  sectors: Sector[];
  defaultSectorId?: string;
  onSave: (input: KanbanCabinetInput, editingId?: string) => Promise<void>;
}

export function KanbanCabinetDialog({
  open,
  onOpenChange,
  cabinet,
  hasParts = false,
  sectors,
  defaultSectorId,
  onSave,
}: KanbanCabinetDialogProps) {
  const [sectorId, setSectorId] = useState("");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (cabinet) {
      setSectorId(cabinet.sector_id);
      setName(cabinet.name);
      setLocation(cabinet.location ?? "");
    } else {
      setSectorId(defaultSectorId && defaultSectorId !== "all" ? defaultSectorId : "");
      setName("");
      setLocation("");
    }
  }, [open, cabinet, defaultSectorId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!sectorId) {
      setError("Selecione o setor do armário (Kanban).");
      return;
    }
    if (!name.trim()) {
      setError("Informe o nome do armário (Kanban).");
      return;
    }

    setSaving(true);
    try {
      await onSave(
        {
          sector_id: sectorId,
          name: name.trim(),
          location: location.trim() || null,
        },
        cabinet?.id
      );
      onOpenChange(false);
    } catch (err: any) {
      setError(err?.message || "Erro ao salvar armário (Kanban).");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="w-5 h-5 text-primary" />
            {cabinet ? "Editar Armário (Kanban)" : "Novo Armário (Kanban)"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cabinet-sector">Setor *</Label>
            <Select value={sectorId} onValueChange={setSectorId} disabled={Boolean(cabinet && hasParts)}>
              <SelectTrigger id="cabinet-sector">
                <SelectValue placeholder="Selecione o setor" />
              </SelectTrigger>
              <SelectContent>
                {sectors.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {cabinet && hasParts && (
              <p className="text-xs text-muted-foreground">
                Este armário já possui peças cadastradas, por isso o setor não pode ser alterado.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cabinet-name">Nome do Armário (Kanban) *</Label>
            <Input
              id="cabinet-name"
              placeholder="Ex: Armário Mecânico Linha 1, Kanban Elétrica"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cabinet-location">Localização / Descrição (opcional)</Label>
            <Input
              id="cabinet-location"
              placeholder="Ex: Corredor B · Próximo à Prensa 04"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {cabinet ? "Salvar Armário" : "Criar Armário"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}