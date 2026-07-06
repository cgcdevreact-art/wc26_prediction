import { AdminHeader } from "@/components/admin/AdminHeader";
import { DashboardContent } from "@/components/admin/DashboardContent";

export default function AdminDashboard() {
  return (
    <>
      <AdminHeader
        title="Dashboard"
        description="Overview of 26WC Prediction"
      />
      <DashboardContent />
    </>
  );
}
