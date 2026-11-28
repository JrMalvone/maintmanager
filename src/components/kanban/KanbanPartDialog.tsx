import { useEffect, useMemo, useState } from "react";
import type { Machine, Sector } from "@/hooks/useData";
import type { KanbanCabinetInput, KanbanPartInput } from "@/hooks/useKanbanParts";
import {
  KANBAN_CATEGORY_LABELS,
  type KanbanCabinet,
  type KanbanCategory,
  type KanbanPart,
} from "@/lib/kanbanParts";
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
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Globe, Loader2, Plus, Search, X } from "lucide-react";

interface KanbanPartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  part: KanbanPart | null;
  sectors: Sector[];
  cabinets: KanbanCabinet[];
  machines: Machine[];
  defaultSectorId?: string;
  defaultCabinetId?: string;
  defaultMachineId?: string;
  onSave: (input: KanbanPartInput, editingId?: string) => Promise<void>;
  onCreateCabinet?: (input: KanbanCabinetInput) => Promise<KanbanCabinet>;
}

export function KanbanPartDialog({
  open,
  onOpenChange,
  part,
  sectors,
  cabinets,
  machines,
  defaultSectorId,
  defaultCabinetId,
  defaultMachineId,
  onSave,
  onCreateCabinet,
}: KanbanPartDialogProps) {
  const [sectorId, setSectorId] = useState<string>("");
  const [cabinetId, setCabinetId] = useState<string>("");
  const [showNewCabinet, setShowNewCabinet] = useState(false);
  const [newCabinetName, setNewCabinetName] = useState("");
  const [creatingCabinet, setCreatingCabinet] = useState(false);
  const [machineSearch, setMachineSearch] = useState("");
  const [isUniversal, setIsUniversal] = useState(false);
  const [selectedMachineIds, setSelectedMachineIds] = useState<string[]>([]);
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<KanbanCategory>("mechanical");
  const [targetQty, setTargetQty] = useState("2");
  const [currentQty, setCurrentQty] = useState("2");
  const [currentTouched, setCurrentTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const sectorsMap = useMemo(() => new Map(sectors.map((s) => [s.id, s])), [sectors]);
  const machinesMap = useMemo(() => new Map(machines.map((m) => [m.id, m])), [machines]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setMachineSearch("");
    setShowNewCabinet(false);
    setNewCabinetName("");
    if (part) {
      const linkedIds = part.is_universal ? [] : part.machine_ids;
      setSectorId(part.sector_id ?? "");
      setCabinetId(part.cabinet_id ?? "");
      setIsUniversal(part.is_universal);
      setSelectedMachineIds(linkedIds);
      setCode(part.code);
      setDescription(part.description);
      setCategory(part.category);
      setTargetQty(String(part.target_quantity));
      setCurrentQty(String(part.current_quantity));
      setCurrentTouched(true);
    } else {
      const startUniversal = defaultMachineId === "universal";
      const initialMachine =
        defaultMachineId && defaultMachineId !== "all" && defaultMachineId !== "universal"
          ? defaultMachineId
          : "";
      const machineObj = machines.find((m) => m.id === initialMachine);
      const defaultCabObj =
        defaultCabinetId && defaultCabinetId !== "all"
          ? cabinets.find((c) => c.id === defaultCabinetId)
          : undefined;
      const initialSector =
        defaultCabObj?.sector_id ||
        machineObj?.sector_id ||
        (defaultSectorId && defaultSectorId !== "all" ? defaultSectorId : "");
      const matchingCabinets = cabinets.filter((c) => c.sector_id === initialSector);
      const initialCabinet =
        defaultCabObj && defaultCabObj.sector_id === initialSector
          ? defaultCabObj.id
          : matchingCabinets.length === 1
            ? matchingCabinets[0].id
            : "";
      setSectorId(initialSector);
      setCabinetId(initialCabinet);
      setIsUniversal(startUniversal);
      setSelectedMachineIds(initialMachine ? [initialMachine] : []);
      setCode("");
      setDescription("");
      setCategory("mechanical");
      setTargetQty("2");
      setCurrentQty("2");
      setCurrentTouched(false);
    }
  }, [open, part, machines, cabinets, defaultSectorId, defaultCabinetId, defaultMachineId]);

  const sectorCabinets = useMemo(
    () => cabinets.filter((c) => c.sector_id === sectorId),
    [cabinets, sectorId]
  );

  const handleSectorSelect = (value: string) => {
    setSectorId(value);
    setSelectedMachineIds([]);
    setShowNewCabinet(false);
    const matching = cabinets.filter((c) => c.sector_id === value);
    setCabinetId(matching.length === 1 ? matching[0].id : "");
  };

  const handleQuickCreateCabinet = async () => {
    if (!onCreateCabinet || !sectorId) return;
    if (!newCabinetName.trim()) {
      setError("Informe o nome do novo armário (Kanban).");
      return;
    }
    setError(null);
    setCreatingCabinet(true);
    try {
      const created = await onCreateCabinet({ sector_id: sectorId, name: newCabinetName.trim() });
      setCabinetId(created.id);
      setNewCabinetName("");
      setShowNewCabinet(false);
    } catch (err: any) {
      setError(err?.message || "Erro ao criar armário (Kanban).");
    } finally {
      setCreatingCabinet(false);
    }
  };

  const filteredMachines = useMemo(() => {
    const q = machineSearch.trim().toLowerCase();
    return machines.filter((m) => {
      if (!sectorId || m.sector_id !== sectorId) return false;
      if (q) {
        const sectorName = m.sector_id ? sectorsMap.get(m.sector_id)?.name || "" : "";
        const haystack = `${m.code} ${m.model || ""} ${sectorName}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [machines, sectorId, machineSearch, sectorsMap]);

  const selectedSet = useMemo(() => new Set(selectedMachineIds), [selectedMachineIds]);

  const toggleMachine = (id: string) => {
    setSelectedMachineIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAllVisible = () => {
    setSelectedMachineIds((prev) => {
      const next = new Set(prev);
      for (const m of filteredMachines) next.add(m.id);
      return Array.from(next);
    });
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

    if (!sectorId) {
      setError("Selecione o setor do Kanban.");
      return;
    }
    if (!cabinetId) {
      setError("Selecione o armário (Kanban) onde a peça fica estocada.");
      return;
    }
    if (!isUniversal && selectedMachineIds.length === 0) {
      setError("Selecione pelo menos um equipamento ou marque como Peça Universal.");
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
          sector_id: sectorId,
          cabinet_id: cabinetId,
          is_universal: isUniversal,
          machine_ids: isUniversal ? [] : selectedMachineIds,
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
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{part ? "Editar Peça do Kanban" : "Nova Peça no Kanban"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="kanban-sector">Setor *</Label>
              <Select value={sectorId} disabled={Boolean(part?.sector_id)} onValueChange={handleSectorSelect}>
                <SelectTrigger id="kanban-sector">
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
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="kanban-cabinet">Armário (Kanban) *</Label>
                {sectorId && onCreateCabinet && (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs"
                    onClick={() => setShowNewCabinet((cur) => !cur)}
                  >
                    <Plus className="w-3 h-3 mr-0.5" />
                    Novo armário
                  </Button>
                )}
              </div>
              <Select
                value={cabinetId}
                disabled={!sectorId || sectorCabinets.length === 0}
                onValueChange={setCabinetId}
              >
                <SelectTrigger id="kanban-cabinet">
                  <SelectValue
                    placeholder={
                      !sectorId
                        ? "Escolha o setor primeiro"
                        : sectorCabinets.length === 0
                          ? "Nenhum armário neste setor"
                          : "Selecione o armário"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {sectorCabinets.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {sectorId && onCreateCabinet && (showNewCabinet || sectorCabinets.length === 0) && (
            <div className="rounded-lg border border-dashed border-primary/50 bg-primary/5 p-3 space-y-2">
              <p className="text-xs font-medium">
                {sectorCabinets.length === 0
                  ? "Crie o primeiro armário (Kanban) deste setor:"
                  : "Criar novo armário (Kanban) neste setor:"}
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: Armário Mecânico Linha 1"
                  value={newCabinetName}
                  onChange={(e) => setNewCabinetName(e.target.value)}
                  className="h-9 text-xs"
                />
                <Button
                  type="button"
                  size="sm"
                  className="h-9 shrink-0"
                  disabled={creatingCabinet}
                  onClick={handleQuickCreateCabinet}
                >
                  {creatingCabinet && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
                  Criar
                </Button>
              </div>
            </div>
          )}
          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <Label htmlFor="kanban-universal" className="flex items-center gap-1.5 font-semibold cursor-pointer">
                  <Globe className="w-4 h-4 text-primary" />
                  Peça Universal do Setor
                </Label>
                <p className="text-xs text-muted-foreground">
                  Todas as máquinas do setor selecionado
                </p>
              </div>
              <Switch
                id="kanban-universal"
                checked={isUniversal}
                onCheckedChange={setIsUniversal}
              />
            </div>

            {!isUniversal && (
              <div className="space-y-2.5 pt-2 border-t border-border">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <Input
                      placeholder="Buscar equipamento..."
                      value={machineSearch}
                      onChange={(e) => setMachineSearch(e.target.value)}
                      className="h-9 pl-8 text-xs"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-muted-foreground">
                    Equipamentos vinculados: <strong className="text-foreground">{selectedMachineIds.length}</strong>
                  </span>
                  <div className="flex items-center gap-2">
                    {filteredMachines.length > 0 && (
                      <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs" onClick={selectAllVisible}>
                        Selecionar visíveis ({filteredMachines.length})
                      </Button>
                    )}
                    {selectedMachineIds.length > 0 && (
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs text-muted-foreground hover:text-destructive"
                        onClick={() => setSelectedMachineIds([])}
                      >
                        Limpar
                      </Button>
                    )}
                  </div>
                </div>

                {selectedMachineIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                    {selectedMachineIds.map((id) => {
                      const m = machinesMap.get(id);
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1 rounded bg-primary/15 text-primary px-2 py-0.5 text-xs font-mono"
                        >
                          {m?.code || id}
                          <button
                            type="button"
                            onClick={() => toggleMachine(id)}
                            aria-label={`Remover equipamento ${m?.code || id}`}
                            className="hover:text-destructive"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                <div className="max-h-44 overflow-y-auto rounded-md border border-border bg-background p-2 space-y-1">
                  {filteredMachines.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      Nenhum equipamento encontrado com este filtro.
                    </p>
                  ) : (
                    filteredMachines.map((m) => {
                      const sectorName = m.sector_id ? sectorsMap.get(m.sector_id)?.name : undefined;
                      const checked = selectedSet.has(m.id);
                      return (
                        <label
                          key={m.id}
                          className="flex items-center justify-between gap-2 rounded px-2 py-1.5 text-xs hover:bg-muted/60 cursor-pointer"
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => toggleMachine(m.id)}
                            />
                            <span className="font-mono font-medium truncate">{machineLabel(m)}</span>
                          </span>
                          <span className="text-muted-foreground shrink-0 truncate max-w-[140px]">
                            {sectorName || "Sem setor"}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="kanban-target">Qtd. Estipulada no Armário *</Label>
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
              <Label htmlFor="kanban-current">Saldo Atual no Armário *</Label>
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