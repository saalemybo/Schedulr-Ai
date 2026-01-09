import BookingClient from "./BookingClient";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <BookingClient slug={slug} />;
}
