import { CommissionerHeader } from "@/components/commissioner/CommissionerHeader";
import { DashboardContent } from "@/components/commissioner/DashboardContent";

export default function CommissionerDashboard() {
  return (
    <>
      <CommissionerHeader
        title="Dashboard"
        description="Overview of 26WC Prediction"
      />
      <DashboardContent />
    </>
  );
}
