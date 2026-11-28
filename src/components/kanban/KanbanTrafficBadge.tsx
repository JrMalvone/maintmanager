import { cn } from "@/lib/utils";
import {
  KANBAN_TRAFFIC_LIGHT_LABELS,
  getKanbanTrafficLight,
  type KanbanTrafficLight,
} from "@/lib/kanbanParts";

const BADGE_CLASS: Record<KanbanTrafficLight, string> = {
  green: "kanban-light-green",
  yellow: "kanban-light-yellow",
  red: "kanban-light-red",
};

const DOT_CLASS: Record<KanbanTrafficLight, string> = {
  green: "kanban-dot-green",
  yellow: "kanban-dot-yellow",
  red: "kanban-dot-red",
};

interface KanbanTrafficBadgeProps {
  currentQuantity: number;
  targetQuantity: number;
  compact?: boolean;
  className?: string;
}

export function KanbanTrafficBadge({
  currentQuantity,
  targetQuantity,
  compact = false,
  className,
}: KanbanTrafficBadgeProps) {
  const light = getKanbanTrafficLight(currentQuantity, targetQuantity);
  const label = compact
    ? light === "green"
      ? "Cheio"
      : light === "yellow"
        ? "Atenção"
        : "Crítico"
    : KANBAN_TRAFFIC_LIGHT_LABELS[light];

  return (
    <span className={cn(BADGE_CLASS[light], className)}>
      <span className={cn("w-2 h-2 rounded-full shrink-0", DOT_CLASS[light])} />
      {label}
    </span>
  );
}

export function KanbanTrafficDot({
  light,
  className,
}: {
  light: KanbanTrafficLight;
  className?: string;
}) {
  return <span className={cn("inline-block w-2.5 h-2.5 rounded-full shrink-0", DOT_CLASS[light], className)} />;
}