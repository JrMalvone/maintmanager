import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Factory, ChevronDown } from "lucide-react";

interface Sector {
  id: string;
  name: string;
}

interface SectorMultiSelectProps {
  sectors: Sector[];
  selected: string[];
  onChange: (ids: string[]) => void;
}

export function SectorMultiSelect({ sectors, selected, onChange }: SectorMultiSelectProps) {
  const allSelected = selected.length === 0;

  function toggle(id: string) {
    onChange(
      selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]
    );
  }

  const label = allSelected
    ? "Todos os setores"
    : selected.length === 1
      ? sectors.find((s) => s.id === selected[0])?.name ?? "1 setor"
      : `${selected.length} setores`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full sm:w-[240px] h-10 justify-between">
          <span className="flex items-center gap-2 truncate">
            <Factory className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="truncate">{label}</span>
          </span>
          <ChevronDown className="w-4 h-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-2 bg-popover z-50" align="start">
        <div className="flex items-center justify-between px-1 pb-2">
          <span className="text-xs font-medium text-muted-foreground">Setores</span>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onChange([])}>
            Limpar
          </Button>
        </div>
        <div className="max-h-64 overflow-y-auto space-y-1">
          {sectors.map((s) => (
            <label
              key={s.id}
              className="flex items-center gap-2 rounded-md px-2 py-2 hover:bg-accent cursor-pointer"
            >
              <Checkbox
                checked={selected.includes(s.id)}
                onCheckedChange={() => toggle(s.id)}
              />
              <span className="text-sm">{s.name}</span>
            </label>
          ))}
          {sectors.length === 0 && (
            <p className="text-sm text-muted-foreground px-2 py-2">Nenhum setor cadastrado</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
