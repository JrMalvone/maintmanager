import { CheckCircle, AlertTriangle, Clock } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SapStatusBadgeProps {
  status: string | null;
  notificationNumber: string | null;
  syncMessage: string | null;
  compact?: boolean;
}

export function SapStatusBadge({
  status,
  notificationNumber,
  syncMessage,
  compact = false,
}: SapStatusBadgeProps) {
  const sapStatus = status || "Pending";

  if (sapStatus === "Synced" && notificationNumber) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
        <CheckCircle className="w-3 h-3" />
        {compact ? `SAP` : `SAP: ${notificationNumber}`}
      </span>
    );
  }

  if (sapStatus === "Error") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-destructive/10 text-destructive border border-destructive/30 cursor-help">
              <AlertTriangle className="w-3 h-3" />
              {compact ? "SAP" : "SAP Erro"}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[250px]">
            <p className="text-xs">{syncMessage || "Erro desconhecido na sincronização SAP"}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Pending
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground border border-border">
      <Clock className="w-3 h-3" />
      {compact ? "SAP" : "Aguardando SAP"}
    </span>
  );
}
