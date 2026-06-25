import { ShieldAlert } from "lucide-react";

import { Card, SectionHeading } from "@/components/ui";

export function AccessLimited() {
  return (
    <div className="space-y-7">
      <SectionHeading
        eyebrow="Club pending"
        title="No active club is available"
        description="Sign out and back in to create or refresh your private club."
      />
      <Card className="flex items-start gap-3 border-amber-200 bg-amber-50 text-amber-950">
        <ShieldAlert className="mt-0.5 shrink-0" size={20} />
        <p className="text-sm font-semibold leading-6">
          Your account is signed in, but it does not have an active club
          membership yet.
        </p>
      </Card>
    </div>
  );
}
