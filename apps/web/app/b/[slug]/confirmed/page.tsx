import Link from "next/link";

export default async function ConfirmedPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ appt?: string }>;
}) {
  const { slug } = await params;
  const { appt } = await searchParams;

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-3xl font-bold">Booking Confirmed 🎉</h1>

        {appt ? (
          <p className="text-sm text-gray-600 font-mono">
            Confirmation ID: {appt}
          </p>
        ) : null}

        <Link
          href={`/b/${slug}`}
          className="inline-block rounded border px-4 py-2 text-sm hover:bg-gray-50"
        >
          Back to booking page
        </Link>
      </div>
    </main>
  );
}
