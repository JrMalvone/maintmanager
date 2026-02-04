import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { TechnicianDashboard } from "@/components/technician/TechnicianDashboard";

export default function OrdersPage() {
  return (
    <DashboardLayout requiredRoles={["technician", "manager"]}>
      <TechnicianDashboard />
    </DashboardLayout>
  );
}
