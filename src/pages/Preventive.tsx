import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PreventiveDashboard } from "@/components/preventive/PreventiveDashboard";

export default function PreventivePage() {
  return (
    <DashboardLayout requiredRoles={["manutencao", "gestor"]}>
      <PreventiveDashboard />
    </DashboardLayout>
  );
}