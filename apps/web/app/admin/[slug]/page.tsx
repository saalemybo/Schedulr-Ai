import AdminClient from "./AdminClient";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <AdminClient slug={slug} />;
}
