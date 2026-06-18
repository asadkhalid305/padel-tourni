import { NextResponse } from "next/server";

import {
  adminRoleRequestSchema,
  isAdminRoleRequestAuthorized,
  setAppUserRoleByEmail,
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

  const result = await setAppUserRoleByEmail(
    parsed.data.email,
    parsed.data.role,
  );
  if (!result.ok) {
    return NextResponse.json(
      { error: result.message },
      { status: result.status },
    );
  }

  return NextResponse.json({ user: result.user });
}
