"use client";

import { Copy, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import { deleteEvent, type ActionState } from "@/app/actions";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { Button } from "@/components/ui";

const initialState: ActionState = { ok: false, message: "" };

export function EventAdminActions({
  eventId,
  canDelete,
  showDelete,
}: {
  eventId: string;
  canDelete: boolean;
  showDelete: boolean;
}) {
  const [state, action] = useActionState(deleteEvent, initialState);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href={`/events/${eventId}/edit`}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/20"
      >
        <Pencil size={17} />
        Edit
      </Link>
      <Link
        href={`/events/${eventId}/duplicate`}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/20"
      >
        <Copy size={17} />
        Duplicate
      </Link>
      {showDelete && canDelete ? (
        confirmingDelete ? (
          <form action={action} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="eventId" value={eventId} />
            <PendingSubmitButton variant="danger" pendingLabel="Deleting...">
              <Trash2 size={17} />
              Delete
            </PendingSubmitButton>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmingDelete(false)}
            >
              Cancel
            </Button>
          </form>
        ) : (
          <Button
            type="button"
            variant="danger"
            onClick={() => setConfirmingDelete(true)}
          >
            <Trash2 size={17} />
            Delete
          </Button>
        )
      ) : showDelete ? (
        <Button
          type="button"
          variant="danger"
          disabled
          title="Delete is locked once matches have started or scores exist."
        >
          <Trash2 size={17} />
          Delete
        </Button>
      ) : null}
      {showDelete && !canDelete ? (
        <p className="basis-full text-sm font-bold text-amber-100">
          Delete is locked because this event already has match activity.
        </p>
      ) : null}
      {state.message ? (
        <p
          className={`basis-full text-sm font-bold ${
            state.ok ? "text-emerald-100" : "text-rose-100"
          }`}
          role="status"
        >
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
