import type { Sector } from "@/hooks/useData";
import {
  summarizeKanbanParts,
  type KanbanCabinet,
  type KanbanPart,
} from "@/lib/kanbanParts";
import { KanbanTrafficDot } from "./KanbanTrafficBadge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Archive, Pencil, Plus, Trash2 } from "lucide-react";

interface KanbanCabinetsStripProps {
  cabinets: KanbanCabinet[];
  parts: KanbanPart[];
  sectorsMap: Map<string, Sector>;
  sectorFilter: string;
  selectedCabinetId: string;
  onSelectCabinet: (cabinetId: string) => void;
  onCreateCabinet: () => void;
  onEditCabinet: (cabinet: KanbanCabinet) => void;
  onDeleteCabinet: (cabinet: KanbanCabinet) => void;
}

export function KanbanCabinetsStrip({
  cabinets,
  parts,
  sectorsMap,
  sectorFilter,
  selectedCabinetId,
  onSelectCabinet,
  onCreateCabinet,
  onEditCabinet,
  onDeleteCabinet,
}: KanbanCabinetsStripProps) {
  const partsByCabinet = new Map<string, KanbanPart[]>();
  for (const part of parts) {
    if (!part.cabinet_id) continue;
    const list = partsByCabinet.get(part.cabinet_id) ?? [];
    list.push(part);
    partsByCabinet.set(part.cabinet_id, list);
  }

  if (cabinets.length === 0) {
    return (
      <div className="industrial-card p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
          <Archive className="w-4 h-4 text-primary shrink-0" />
          <span>
            {sectorFilter === "all"
              ? "Nenhum armário (Kanban) cadastrado ainda."
              : `Nenhum armário (Kanban) cadastrado no setor ${sectorsMap.get(sectorFilter)?.name ?? ""}.`}
          </span>
        </div>
        <Button size="sm" variant="outline" onClick={onCreateCabinet} className="gap-1.5">
          <Plus className="w-4 h-4" />
          Criar Armário
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Archive className="w-3.5 h-3.5 text-primary" />
          <span>Armários · Kanbans ({cabinets.length})</span>
        </div>
        {selectedCabinetId !== "all" && (
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs"
            onClick={() => onSelectCabinet("all")}
          >
            Ver todos os armários
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {cabinets.map((cabinet) => {
          const cabParts = partsByCabinet.get(cabinet.id) ?? [];
          const stats = summarizeKanbanParts(cabParts);
          const isSelected = selectedCabinetId === cabinet.id;
          const sectorName = sectorsMap.get(cabinet.sector_id)?.name ?? "Setor";

          return (
            <div
              key={cabinet.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelectCabinet(isSelected ? "all" : cabinet.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectCabinet(isSelected ? "all" : cabinet.id);
                }
              }}
              className={cn(
                "industrial-card p-3.5 text-left transition-colors cursor-pointer flex flex-col justify-between gap-2.5",
                isSelected ? "ring-2 ring-primary bg-primary/5" : "hover:border-primary/50"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-sm leading-tight truncate">{cabinet.name}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {sectorFilter === "all" ? sectorName : cabinet.location || sectorName}
                  </p>
                  {sectorFilter === "all" && cabinet.location && (
                    <p className="text-[11px] text-muted-foreground/80 truncate">{cabinet.location}</p>
                  )}
                </div>
                <div className="flex items-center shrink-0" onClick={(e) => e.stopPropagation()}>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => onEditCabinet(cabinet)}
                    title="Editar armário"
                    aria-label={`Editar armário ${cabinet.name}`}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => onDeleteCabinet(cabinet)}
                    title="Excluir armário"
                    aria-label={`Excluir armário ${cabinet.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-border text-xs">
                <span className="font-mono text-muted-foreground">
                  {stats.total} {stats.total === 1 ? "peça" : "peças"}
                </span>
                <div className="flex items-center gap-2.5 font-mono">
                  <span className="inline-flex items-center gap-1" title="Crítico">
                    <KanbanTrafficDot light="red" className="w-2 h-2" />
                    {stats.red}
                  </span>
                  <span className="inline-flex items-center gap-1" title="Atenção">
                    <KanbanTrafficDot light="yellow" className="w-2 h-2" />
                    {stats.yellow}
                  </span>
                  <span className="inline-flex items-center gap-1" title="Cheio">
                    <KanbanTrafficDot light="green" className="w-2 h-2" />
                    {stats.green}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}