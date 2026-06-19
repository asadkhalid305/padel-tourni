import { Chrome } from "lucide-react";

import { signInWithGoogle } from "@/app/login/actions";
import { PendingSubmitButton } from "@/components/pending-submit-button";

export default function LoginPage() {
  return (
    <div className="grid min-h-screen place-items-center px-5">
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
  );
}
