import Link from "next/link";

import { acceptWorkspaceInvite } from "@/app/actions";
import { BrandLogo } from "@/components/brand-logo";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { Card } from "@/components/ui";
import { getWorkspaceInvitePreview } from "@/lib/data";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Workspace invite" };
export const dynamic = "force-dynamic";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const [invite, user] = await Promise.all([
    getWorkspaceInvitePreview(token),
    getAuthenticatedUser(),
  ]);
  const isPending = invite.status === "pending";

  async function acceptInvite(formData: FormData) {
    "use server";

    await acceptWorkspaceInvite({ ok: false, message: "" }, formData);
  }

  return (
    <div className="court-lines grid min-h-screen place-items-center bg-[var(--ink)] px-5 py-10">
      <main className="w-full max-w-lg">
        <Card className="bg-[var(--sand)] p-7 sm:p-10">
          <BrandLogo
            className="text-[var(--ink)]"
            markClassName="size-12"
            tagline
          />
          <p className="mt-8 text-xs font-black uppercase tracking-[0.18em] text-[var(--green)]">
            Workspace invite
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.045em] text-[var(--ink)]">
            Join a private padel workspace.
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Accepting this invite admits your signed-in account to the
            workspace. You will only see shared tournament data after joining.
          </p>

          {invite.invitedEmail ? (
            <p className="mt-4 rounded-xl bg-white/70 p-3 text-sm font-semibold text-slate-600">
              This invite is for {invite.invitedEmail}.
            </p>
          ) : null}

          {invite.expiresAt ? (
            <p className="mt-3 text-xs font-semibold text-slate-500">
              Expires {formatDate(invite.expiresAt)}
            </p>
          ) : null}

          {!isPending ? (
            <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900">
              {invite.status === "missing"
                ? "This invite was not found."
                : `This invite is ${invite.status}.`}
            </p>
          ) : user ? (
            <form action={acceptInvite} className="mt-7">
              <input type="hidden" name="token" value={token} />
              <PendingSubmitButton
                className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[var(--ink)] px-5 text-sm font-black text-white"
                pendingLabel="Joining workspace..."
              >
                Accept invite
              </PendingSubmitButton>
            </form>
          ) : (
            <Link
              href={`/login?next=/invites/${encodeURIComponent(token)}`}
              className="mt-7 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[var(--ink)] px-5 text-sm font-black text-white"
            >
              Sign in to accept
            </Link>
          )}
        </Card>
      </main>
    </div>
  );
}
