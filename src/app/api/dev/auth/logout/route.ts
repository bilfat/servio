import { NextResponse } from "next/server";
import { DEV_SESSION_COOKIE } from "@/lib/devMonitor/auth";

export async function POST() {
  const response = NextResponse.json(
    { message: "Sesi Developer ditutup." },
    { status: 200 }
  );
  response.cookies.delete(DEV_SESSION_COOKIE);
  return response;
}

