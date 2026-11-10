import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { DEV_SESSION_COOKIE, DevSessionPayload, verifyDevSessionToken } from "./auth";

export async function getDevApiSession(): Promise<DevSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(DEV_SESSION_COOKIE)?.value;
  return verifyDevSessionToken(token);
}

export async function requireDevApiSession(): Promise<
  { session: DevSessionPayload; errorResponse: null } | { session: null; errorResponse: NextResponse }
> {
  const session = await getDevApiSession();
  if (!session) {
    return {
      session: null,
      errorResponse: NextResponse.json(
        {
          error: "DEV_UNAUTHORIZED",
          message: "Sesi Developer Observability tidak valid atau sudah berakhir. Silakan login ulang di /dev/login.",
        },
        { status: 401 }
      ),
    };
  }
  return { session, errorResponse: null };
}

