import { useMemo, useState } from "react";
import { useMachines, useSectors } from "@/hooks/useData";
import { useKanbanParts, type KanbanPartInput } from "@/hooks/useKanbanParts";
import { useAppAuth } from "@/hooks/useAppAuth";
import {
  KANBAN_CATEGORY_LABELS,
  describeKanbanPartScope,
  getKanbanMissingQuantity,
  getKanbanStockPercent,
  getKanbanTrafficLight,
  partAppliesToScope,
  sortKanbanPartsByUrgency,
  summarizeKanbanParts,
  type KanbanCategory,
  type KanbanPart,
  type KanbanTrafficLight,
} from "@/lib/kanbanParts";
import { machineLabel } from "@/lib/machineLabel";
import { KanbanTrafficBadge, KanbanTrafficDot } from "./KanbanTrafficBadge";
import { KanbanPartDialog } from "./KanbanPartDialog";
import { KanbanReplenishDialog } from "./KanbanReplenishDialog";
import { KanbanMovementsDialog } from "./KanbanMovementsDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Boxes,
  Globe,
  History,
  Loader2,
  PackagePlus,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

type LightFilter = "all" | "restock" | KanbanTrafficLight;

export function KanbanPartsDashboard() {
  const { user } = useAppAuth();
  const { toast } = useToast();
  const { sectors } = useSectors();
  const { machines } = useMachines(undefined, false);
  const { parts, loading, createPart, updatePart, deletePart, replenishPart } = useKanbanParts();

  const [sectorFilter, setSectorFilter] = useState("all");
  const [machineFilter, setMachineFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | KanbanCategory>("all");
  const [lightFilter, setLightFilter] = useState<LightFilter>("all");
  const [search, setSearch] = useState("");

  const [partDialogOpen, setPartDialogOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<KanbanPart | null>(null);
  const [replenishTarget, setReplenishTarget] = useState<KanbanPart | null>(null);
  const [historyTarget, setHistoryTarget] = useState<KanbanPart | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<KanbanPart | null>(null);

  const sectorsMap = useMemo(() => new Map(sectors.map((s) => [s.id, s])), [sectors]);
  const machinesMap = useMemo(() => new Map(machines.map((m) => [m.id, m])), [machines]);

  const sectorMachines = useMemo(() => {
    if (sectorFilter === "all") return machines;
    return machines.filter((m) => m.sector_id === sectorFilter);
  }, [machines, sectorFilter]);

  const handleSectorChange = (next: string) => {
    setSectorFilter(next);
    if (
      machineFilter !== "all" &&
      machineFilter !== "universal" &&
      next !== "all" &&
      machinesMap.get(machineFilter)?.sector_id !== next
    ) {
      setMachineFilter("all");
    }
  };

  // Base scope (sector + machine + category + search) for accurate summary counters
  const scopedParts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return parts.filter((part) => {
      if (!partAppliesToScope(part, sectorFilter, machineFilter, machinesMap)) return false;
      if (categoryFilter !== "all" && part.category !== categoryFilter) return false;
      if (q) {
        const linkedText = part.is_universal
          ? "universal todas as maquinas"
          : part.machine_ids
              .map((id) => {
                const m = machinesMap.get(id);
                const s = m?.sector_id ? sectorsMap.get(m.sector_id) : undefined;
                return `${m?.code || ""} ${m?.model || ""} ${s?.name || ""}`;
              })
              .join(" ");
        const haystack = `${part.code} ${part.description} ${linkedText}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [parts, machinesMap, sectorsMap, sectorFilter, machineFilter, categoryFilter, search]);

  const summary = useMemo(() => summarizeKanbanParts(scopedParts), [scopedParts]);

  const visibleParts = useMemo(() => {
    const filtered = scopedParts.filter((part) => {
      if (lightFilter === "all") return true;
      const light = getKanbanTrafficLight(part.current_quantity, part.target_quantity);
      if (lightFilter === "restock") return light === "red" || light === "yellow";
      return light === lightFilter;
    });
    return sortKanbanPartsByUrgency(filtered);
  }, [scopedParts, lightFilter]);

  const handleSavePart = async (input: KanbanPartInput, editingId?: string) => {
    if (editingId) {
      await updatePart(editingId, input);
      toast({ title: "Peça atualizada no Kanban" });
    } else {
      await createPart(input);
      toast({ title: "Peça cadastrada no Kanban" });
    }
  };

  const handleReplenish = async (partId: string, quantity: number, notes?: string) => {
    const movement = await replenishPart(partId, quantity, user || "Gestão", notes);
    toast({
      title: "Reabastecimento registrado",
      description: `Entrada de +${quantity} un · Novo saldo: ${movement.new_quantity}`,
    });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deletePart(deleteTarget.id);
      toast({ title: "Peça removida do Kanban" });
    } catch (err: any) {
      toast({ title: "Erro ao remover peça", description: err?.message, variant: "destructive" });
    } finally {
      setDeleteTarget(null);
    }
  };

  const getPartScope = (part: KanbanPart) =>
    describeKanbanPartScope(part, machinesMap, sectorsMap, machineLabel);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Boxes className="w-6 h-6 text-primary" />
            Kanban de Peças
          </h1>
          <p className="text-sm text-muted-foreground">
            Controle de peças mecânicas e eletrônicas compartilhadas ou universais com farol de reposição
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {summary.needsRestock > 0 && (
            <Button
              variant={lightFilter === "restock" ? "default" : "outline"}
              onClick={() => setLightFilter((cur) => (cur === "restock" ? "all" : "restock"))}
              className="gap-2"
            >
              <AlertTriangle className="w-4 h-4" />
              Precisam Repor ({summary.needsRestock})
            </Button>
          )}
          <Button
            onClick={() => {
              setEditingPart(null);
              setPartDialogOpen(true);
            }}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Nova Peça
          </Button>
        </div>
      </div>

      {/* Farol Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => setLightFilter("all")}
          className={cn(
            "industrial-card p-4 text-left transition-colors",
            lightFilter === "all" && "ring-2 ring-primary"
          )}
        >
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Total de Peças</p>
          <p className="text-2xl font-bold mt-1">{summary.total}</p>
          <p className="text-xs text-muted-foreground mt-0.5">No filtro atual</p>
        </button>

        <button
          type="button"
          onClick={() => setLightFilter((cur) => (cur === "green" ? "all" : "green"))}
          className={cn(
            "industrial-card p-4 text-left transition-colors",
            lightFilter === "green" && "ring-2 ring-primary"
          )}
        >
          <p className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <KanbanTrafficDot light="green" /> Estoque Cheio
          </p>
          <p className="text-2xl font-bold mt-1">{summary.green}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Acima de 50% da meta</p>
        </button>

        <button
          type="button"
          onClick={() => setLightFilter((cur) => (cur === "yellow" ? "all" : "yellow"))}
          className={cn(
            "industrial-card p-4 text-left transition-colors",
            lightFilter === "yellow" && "ring-2 ring-primary"
          )}
        >
          <p className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <KanbanTrafficDot light="yellow" /> Atenção · Repor
          </p>
          <p className="text-2xl font-bold mt-1">{summary.yellow}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Até 50% da meta</p>
        </button>

        <button
          type="button"
          onClick={() => setLightFilter((cur) => (cur === "red" ? "all" : "red"))}
          className={cn(
            "industrial-card p-4 text-left transition-colors",
            lightFilter === "red" && "ring-2 ring-primary"
          )}
        >
          <p className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <KanbanTrafficDot light="red" /> Crítico · Zerado
          </p>
          <p className="text-2xl font-bold mt-1">{summary.red}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Sem estoque no Kanban</p>
        </button>
      </div>

      {/* Filters */}
      <div className="industrial-card p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Select value={sectorFilter} onValueChange={handleSectorChange}>
          <SelectTrigger>
            <SelectValue placeholder="Filtrar por setor" />
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

        <Select value={machineFilter} onValueChange={setMachineFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Filtrar por equipamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os equipamentos</SelectItem>
            <SelectItem value="universal">Somente peças universais</SelectItem>
            {sectorMachines.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {machineLabel(m)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={categoryFilter}
          onValueChange={(v) => setCategoryFilter(v as "all" | KanbanCategory)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Tipo de peça" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Mecânica e Eletrônica</SelectItem>
            <SelectItem value="mechanical">Mecânica</SelectItem>
            <SelectItem value="electronic">Eletrônica</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Buscar código ou descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Parts List */}
      {loading ? (
        <div className="industrial-card p-12 flex items-center justify-center text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Carregando peças do Kanban...
        </div>
      ) : visibleParts.length === 0 ? (
        <div className="industrial-card p-10 text-center space-y-3">
          <Boxes className="w-10 h-10 text-muted-foreground mx-auto opacity-60" />
          <p className="font-medium">
            {parts.length === 0
              ? "Nenhuma peça cadastrada no Kanban ainda"
              : "Nenhuma peça encontrada com os filtros selecionados"}
          </p>
          <p className="text-sm text-muted-foreground">
            {parts.length === 0
              ? "Cadastre as peças mecânicas e eletrônicas de cada equipamento e defina a quantidade do Kanban."
              : "Ajuste os filtros ou limpe a busca para visualizar outras peças."}
          </p>
          {parts.length === 0 && (
            <Button
              onClick={() => {
                setEditingPart(null);
                setPartDialogOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Cadastrar Primeira Peça
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visibleParts.map((part) => {
            const scope = getPartScope(part);
            const light = getKanbanTrafficLight(part.current_quantity, part.target_quantity);
            const percent = getKanbanStockPercent(part.current_quantity, part.target_quantity);
            const missing = getKanbanMissingQuantity(part.current_quantity, part.target_quantity);
            const barColor =
              light === "red"
                ? "bg-destructive"
                : light === "yellow"
                  ? "bg-[hsl(var(--status-open))]"
                  : "bg-[hsl(var(--status-closed))]";

            return (
              <div
                key={part.id}
                className={cn(
                  "industrial-card p-4 flex flex-col justify-between gap-4 border-l-4",
                  light === "red"
                    ? "border-l-[hsl(var(--status-stopped))]"
                    : light === "yellow"
                      ? "border-l-[hsl(var(--status-open))]"
                      : "border-l-[hsl(var(--status-closed))]"
                )}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-bold text-primary">
                          {part.code}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-secondary text-secondary-foreground font-medium">
                          {KANBAN_CATEGORY_LABELS[part.category]}
                        </span>
                      </div>
                      <h3 className="font-semibold text-base mt-1 leading-snug break-words">
                        {part.description}
                      </h3>
                    </div>
                    <KanbanTrafficBadge
                      currentQuantity={part.current_quantity}
                      targetQuantity={part.target_quantity}
                      compact
                      className="shrink-0"
                    />
                  </div>

                  <div
                    className="text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-1"
                    title={scope.tooltip}
                  >
                    <span className="font-mono font-medium text-foreground inline-flex items-center gap-1 min-w-0 truncate">
                      {part.is_universal && <Globe className="w-3.5 h-3.5 text-primary shrink-0" />}
                      <span className="truncate">{scope.primary}</span>
                    </span>
                    <span className="shrink-0">{scope.secondary}</span>
                  </div>

                  {/* Stock level bar */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-baseline justify-between text-xs">
                      <span>
                        Saldo:{" "}
                        <strong className="text-base font-mono text-foreground">
                          {part.current_quantity}
                        </strong>{" "}
                        <span className="text-muted-foreground">/ {part.target_quantity} un</span>
                      </span>
                      <span className="font-mono text-muted-foreground">
                        {missing > 0 ? `Faltam ${missing} un` : `${percent}%`}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all", barColor)}
                        style={{ width: `${Math.min(100, percent)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
                  <Button
                    size="sm"
                    variant={light === "green" ? "outline" : "default"}
                    onClick={() => setReplenishTarget(part)}
                    className="gap-1.5 flex-1"
                  >
                    <PackagePlus className="w-4 h-4" />
                    Reabastecer
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setHistoryTarget(part)}
                    title="Histórico de movimentações"
                    aria-label="Histórico de movimentações"
                  >
                    <History className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setEditingPart(part);
                      setPartDialogOpen(true);
                    }}
                    title="Editar peça"
                    aria-label="Editar peça"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteTarget(part)}
                    title="Excluir peça"
                    aria-label="Excluir peça"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <KanbanPartDialog
        open={partDialogOpen}
        onOpenChange={setPartDialogOpen}
        part={editingPart}
        sectors={sectors}
        machines={machines}
        defaultSectorId={sectorFilter}
        defaultMachineId={machineFilter}
        onSave={handleSavePart}
      />

      <KanbanReplenishDialog
        open={!!replenishTarget}
        onOpenChange={(open) => !open && setReplenishTarget(null)}
        part={replenishTarget}
        machineDisplay={replenishTarget ? getPartScope(replenishTarget).summaryText : "—"}
        onConfirm={handleReplenish}
      />

      <KanbanMovementsDialog
        open={!!historyTarget}
        onOpenChange={(open) => !open && setHistoryTarget(null)}
        part={historyTarget}
        machineDisplay={historyTarget ? getPartScope(historyTarget).summaryText : "—"}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover peça do Kanban?</AlertDialogTitle>
            <AlertDialogDescription>
              A peça <strong>{deleteTarget?.code}</strong> ({deleteTarget?.description}) e seu
              histórico de movimentações serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}