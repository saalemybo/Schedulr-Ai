import DashboardClient from "./DashboardClient";

export default async function Page({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params; // ✅ unwrap the Promise
  return <DashboardClient businessId={businessId} />;
}
