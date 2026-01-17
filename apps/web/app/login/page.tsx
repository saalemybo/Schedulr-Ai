"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard");
  }, [status, router]);

  return (
    <main className="min-h-screen p-8 flex items-center justify-center">
      <div className="w-full max-w-md space-y-4 rounded border p-6">
        <h1 className="text-2xl font-bold">Sign in</h1>
        <p className="text-gray-600 text-sm">
          Sign in to manage your business, services, hours, and bookings.
        </p>

        <button
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          className="w-full rounded bg-black px-4 py-2 text-white hover:opacity-90"
        >
          Continue with Google
        </button>
      </div>
    </main>
  );
}
