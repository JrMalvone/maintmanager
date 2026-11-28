import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { KanbanPartsDashboard } from "@/components/kanban/KanbanPartsDashboard";

export default function KanbanPartsPage() {
  return (
    <DashboardLayout requiredRoles={["manutencao", "gestor"]}>
      <KanbanPartsDashboard />
    </DashboardLayout>
  );
}