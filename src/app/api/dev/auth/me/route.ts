import { NextResponse } from "next/server";
import { getDevApiSession } from "@/lib/devMonitor/serverAuth";

export async function GET() {
  const session = await getDevApiSession();
  if (!session) {
    return NextResponse.json(
      { authenticated: false, developer: null },
      { status: 401 }
    );
  }
  return NextResponse.json({
    authenticated: true,
    developer: {
      email: session.email,
      name: session.name,
      role: session.role,
      expiresAt: new Date(session.exp * 1000).toISOString(),
    },
  });
}

