import "server-only";

import { headers } from "next/headers";

export async function requestOrigin() {
  const headerStore = await headers();
  const explicitOrigin = headerStore.get("origin");
  if (explicitOrigin) return explicitOrigin;

  const host =
    headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "";
  if (host) {
    const forwardedProto = headerStore.get("x-forwarded-proto");
    const protocol =
      forwardedProto?.split(",")[0]?.trim() ||
      (host.startsWith("localhost") || host.startsWith("127.0.0.1")
        ? "http"
        : "https");

    return `${protocol}://${host}`;
  }

  return process.env.NEXT_PUBLIC_APP_ORIGIN ?? "http://localhost:3100";
}
