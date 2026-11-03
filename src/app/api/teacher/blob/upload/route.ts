import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { requireTeacherApi } from "@/lib/auth/teacher-api";
import { MAX_LESSON_VIDEO_BYTES } from "@/lib/blob/limits";

export async function POST(request: Request): Promise<NextResponse> {
  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: "Некоректний запит." }, { status: 400 });
  }

  // Client token requests must be teacher-only. Upload-completed webhooks
  // from Vercel Blob have no session cookie — do not gate them here.
  if (body.type === "blob.generate-client-token") {
    const auth = await requireTeacherApi();
    if (!auth.ok) return auth.response;
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const auth = await requireTeacherApi();
        if (!auth.ok) {
          throw new Error("Тільки вчитель може завантажувати відео.");
        }
        return {
          allowedContentTypes: ["video/mp4"],
          maximumSizeInBytes: MAX_LESSON_VIDEO_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ teacherId: auth.session.id }),
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.log("lesson video uploaded", blob.url);
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Помилка завантаження." },
      { status: 400 },
    );
  }
}
