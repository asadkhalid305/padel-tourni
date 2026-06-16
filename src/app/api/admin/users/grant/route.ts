import { NextResponse } from "next/server";

import {
  adminRoleRequestSchema,
  isAdminRoleRequestAuthorized,
  setAdminRoleForEmail,
} from "@/lib/auth-admin";

export async function POST(request: Request) {
  if (!isAdminRoleRequestAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const parsed = adminRoleRequestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  const result = await setAdminRoleForEmail(parsed.data.email, true);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.message },
      { status: result.status },
    );
  }

  return NextResponse.json({ user: result.user });
}
