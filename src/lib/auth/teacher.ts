import { redirect } from "next/navigation";
import { getSession, type SessionUser } from "./session";

export async function requireTeacher(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    redirect("/login?next=/teacher");
  }
  if (session.role !== "teacher") {
    redirect("/?error=teacher-only");
  }
  return session;
}

export function isTeacher(session: SessionUser | null): boolean {
  return session?.role === "teacher";
}
