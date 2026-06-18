import { ShieldAlert } from "lucide-react";

import { Card, SectionHeading } from "@/components/ui";

export function AccessLimited() {
  return (
    <div className="space-y-7">
      <SectionHeading
        eyebrow="Account pending"
        title="Roster access is not linked yet"
        description="An admin needs to link your signed-in account to a roster player before private group data is available."
      />
      <Card className="flex items-start gap-3 border-amber-200 bg-amber-50 text-amber-950">
        <ShieldAlert className="mt-0.5 shrink-0" size={20} />
        <p className="text-sm font-semibold leading-6">
          You are signed in, but this account is not connected to a player and
          does not have an admin role.
        </p>
      </Card>
    </div>
  );
}
