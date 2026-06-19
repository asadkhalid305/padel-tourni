import { Chrome } from "lucide-react";

import { signInWithGoogle } from "@/app/login/actions";
import { formatLoginErrorMessage } from "@/lib/login-errors";
import { PendingSubmitButton } from "@/components/pending-submit-button";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const errorMessage = formatLoginErrorMessage(error);

  return (
    <div className="grid min-h-screen place-items-center px-5">
      <div className="w-full max-w-sm space-y-4">
        {errorMessage ? (
          <div
            className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700"
            role="alert"
          >
            {errorMessage}
          </div>
        ) : null}
        <form action={signInWithGoogle}>
          <PendingSubmitButton
            className="inline-flex min-h-12 items-center justify-center gap-3 rounded-xl bg-[var(--ink)] px-5 text-sm font-black text-white shadow-lg shadow-emerald-950/15 transition hover:bg-[#173d31]"
            pendingLabel="Opening Google..."
          >
            <Chrome size={18} />
            Sign in with Google
          </PendingSubmitButton>
        </form>
      </div>
    </div>
  );
}
