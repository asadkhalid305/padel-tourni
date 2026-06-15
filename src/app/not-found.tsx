import Link from "next/link";

import { Card } from "@/components/ui";

export default function NotFound() {
  return (
    <Card className="mx-auto max-w-xl text-center">
      <p className="text-sm font-black uppercase tracking-[0.2em] text-[var(--green)]">
        404
      </p>
      <h1 className="mt-3 text-3xl font-black">That court is empty.</h1>
      <p className="mt-2 text-slate-500">
        The event may have moved or no longer exists.
      </p>
      <Link
        href="/events"
        className="mt-6 inline-flex rounded-xl bg-[var(--ink)] px-5 py-3 text-sm font-bold text-white"
      >
        Back to events
      </Link>
    </Card>
  );
}
