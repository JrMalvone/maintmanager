import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { TechnicianDashboard } from "@/components/technician/TechnicianDashboard";

export default function OrdersPage() {
  return (
    <DashboardLayout requiredRoles={["manutencao", "gestor"]}>
      <TechnicianDashboard />
    </DashboardLayout>
  );
}
