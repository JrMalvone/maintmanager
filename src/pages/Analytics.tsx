import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ManagerDashboard } from "@/components/manager/ManagerDashboard";

export default function AnalyticsPage() {
  return (
    <DashboardLayout requiredRoles={["manager"]}>
      <ManagerDashboard />
    </DashboardLayout>
  );
}
