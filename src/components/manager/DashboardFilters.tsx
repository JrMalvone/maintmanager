import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, X } from "lucide-react";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

export type PresetPeriod = "daily" | "weekly" | "monthly" | "yearly" | "custom";

export interface DateFilter {
  start: Date;
  end: Date;
  preset: PresetPeriod;
}

interface DashboardFiltersProps {
  filter: DateFilter;
  onChange: (filter: DateFilter) => void;
}

const PRESETS: { value: PresetPeriod; label: string }[] = [
  { value: "daily", label: "Diário" },
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensal" },
  { value: "yearly", label: "Anual" },
];

export function getDefaultFilter(): DateFilter {
  const now = new Date();
  return {
    start: startOfMonth(now),
    end: endOfDay(now),
    preset: "monthly",
  };
}

export function DashboardFilters({ filter, onChange }: DashboardFiltersProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    filter.preset === "custom" ? { from: filter.start, to: filter.end } : undefined
  );

  function handlePreset(preset: PresetPeriod) {
    const now = new Date();
    let start: Date;
    let end: Date;
    switch (preset) {
      case "daily":
        start = startOfDay(now);
        end = endOfDay(now);
        break;
      case "weekly":
        start = startOfWeek(now, { locale: ptBR });
        end = endOfDay(now);
        break;
      case "monthly":
        start = startOfMonth(now);
        end = endOfDay(now);
        break;
      case "yearly":
        start = startOfYear(now);
        end = endOfDay(now);
        break;
      default:
        return;
    }
    setDateRange(undefined);
    onChange({ start, end, preset });
  }

  function handleDateRange(range: DateRange | undefined) {
    setDateRange(range);
    if (range?.from && range?.to) {
      onChange({
        start: startOfDay(range.from),
        end: endOfDay(range.to),
        preset: "custom",
      });
    }
  }

  function clearCustomRange() {
    setDateRange(undefined);
    handlePreset("monthly");
  }

  return (
    <div className="industrial-card p-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground shrink-0">Período:</span>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <Button
              key={p.value}
              variant={filter.preset === p.value ? "default" : "outline"}
              size="sm"
              onClick={() => handlePreset(p.value)}
            >
              {p.label}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-0 sm:ml-auto">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "justify-start text-left font-normal",
                  filter.preset === "custom" && "border-primary text-primary"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filter.preset === "custom" && dateRange?.from && dateRange?.to
                  ? `${format(dateRange.from, "dd/MM/yy")} - ${format(dateRange.to, "dd/MM/yy")}`
                  : "Período personalizado"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={handleDateRange}
                numberOfMonths={2}
                locale={ptBR}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          {filter.preset === "custom" && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={clearCustomRange}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        {format(filter.start, "dd/MM/yyyy", { locale: ptBR })} — {format(filter.end, "dd/MM/yyyy", { locale: ptBR })}
      </p>
    </div>
  );
}
