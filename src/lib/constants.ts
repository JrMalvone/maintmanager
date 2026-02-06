// Application constants

export const APP_NAME = "CMMS Industrial";
export const APP_DESCRIPTION = "Sistema de Gestão de Manutenção Industrial";

// Status labels in Portuguese
export const STATUS_LABELS = {
  open: "Aberta",
  in_progress: "Em Andamento",
  closed: "Fechada",
} as const;

// Priority labels in Portuguese
export const PRIORITY_LABELS = {
  low: "Baixa",
  medium: "Média",
  critical: "Crítica",
} as const;

// Machine status labels
export const MACHINE_STATUS_LABELS = {
  stopped: "Parada",
  running: "Em Operação",
} as const;

// Maintenance type labels
export const MAINTENANCE_TYPE_LABELS = {
  electronic: "Elétrico",
  mechanical: "Mecânico",
} as const;

export type OrderStatus = keyof typeof STATUS_LABELS;
export type PriorityLevel = keyof typeof PRIORITY_LABELS;
export type MaintenanceType = keyof typeof MAINTENANCE_TYPE_LABELS;
