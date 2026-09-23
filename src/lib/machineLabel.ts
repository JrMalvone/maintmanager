import type { Machine } from "@/hooks/useData";

export function machineLabel(machine: Pick<Machine, "code" | "model"> | null | undefined, fallback = "—") {
  if (!machine) return fallback;
  const model = machine.model?.trim();
  return model ? `${machine.code} · ${model}` : machine.code;
}