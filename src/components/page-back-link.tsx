import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export function PageBackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-[var(--ink)]"
    >
      <ArrowLeft size={17} />
      {label}
    </Link>
  );
}
