import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";

type SessionPayload = {
  role?: string;
};

async function readSession(
  req: NextRequest,
): Promise<{ ok: boolean; role?: string }> {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return { ok: false };
  const secret = process.env.AUTH_SECRET;
  if (!secret) return { ok: false };
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
    );
    const role =
      typeof (payload as SessionPayload).role === "string"
        ? (payload as SessionPayload).role
        : undefined;
    return { ok: true, role };
  } catch {
    return { ok: false };
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await readSession(request);

  if (
    (pathname.startsWith("/lessons") || pathname.startsWith("/progress")) &&
    !session.ok
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/teacher")) {
    if (!session.ok) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    if (session.role !== "teacher") {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.searchParams.set("error", "teacher-only");
      return NextResponse.redirect(url);
    }
  }

  if ((pathname === "/login" || pathname === "/signup") && session.ok) {
    const url = request.nextUrl.clone();
    url.pathname = session.role === "teacher" ? "/teacher" : "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/lessons/:path*",
    "/progress",
    "/login",
    "/signup",
    "/teacher",
    "/teacher/:path*",
  ],
};
