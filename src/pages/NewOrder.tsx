import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ServiceOrderForm } from "@/components/operator/ServiceOrderForm";

export default function NewOrderPage() {
  return (
    <DashboardLayout>
      <ServiceOrderForm />
    </DashboardLayout>
  );
}
