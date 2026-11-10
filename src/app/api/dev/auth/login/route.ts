import { NextResponse } from "next/server";
import {
  DEV_SESSION_COOKIE,
  createDevSessionToken,
  validateDevCredentials,
} from "@/lib/devMonitor/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const isDevQuickStage =
      process.env.NODE_ENV === "development" && body?.quickDevStage === true;

    const email = isDevQuickStage
      ? (process.env.DEV_MONITOR_EMAIL || "developer@servio.com").trim().toLowerCase()
      : typeof body?.email === "string"
        ? body.email.trim()
        : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!isDevQuickStage && !validateDevCredentials(email, password)) {
      return NextResponse.json(
        {
          error: "DEV_INVALID_CREDENTIALS",
          message: "Email atau kata sandi Developer Observability tidak sesuai.",
        },
        { status: 401 }
      );
    }

    const token = await createDevSessionToken(email);
    const response = NextResponse.json(
      {
        message: "Autentikasi Developer berhasil.",
        developer: {
          email: email.toLowerCase(),
          name: "SERVIO Lead Developer",
          role: "SYSTEM_DEVELOPER",
        },
      },
      { status: 200 }
    );

    response.cookies.set(DEV_SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 12, // 12 hours
    });

    return response;
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error: "DEV_LOGIN_ERROR",
        message: err instanceof Error ? err.message : "Terjadi kesalahan saat memproses login developer.",
      },
      { status: 500 }
    );
  }
}

