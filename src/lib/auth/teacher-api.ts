import { NextResponse } from "next/server";
import { getSession, type SessionUser } from "./session";

export async function requireTeacherApi(): Promise<
  | { ok: true; session: SessionUser }
  | { ok: false; response: NextResponse }
> {
  const session = await getSession();
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Потрібен вхід." }, { status: 401 }),
    };
  }
  if (session.role !== "teacher") {
    return {
      ok: false,
      response: NextResponse.json({ error: "Немає доступу." }, { status: 403 }),
    };
  }
  return { ok: true, session };
}
