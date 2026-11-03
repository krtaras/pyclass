"use client";

import { upload } from "@vercel/blob/client";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Markdown } from "@/components/Markdown";
import { ExerciseEditor, type ExerciseDTO } from "./ExerciseEditor";
import { QuizEditor, type QuizDTO } from "./QuizEditor";

const MAX_BYTES = 50 * 1024 * 1024;

export function LessonEditor({
  lesson,
  exercises,
  questions,
}: {
  lesson: {
    id: number;
    title: string;
    bodyMarkdown: string;
    videoUrl: string | null;
    videoKind: "youtube" | "blob" | null;
  };
  exercises: ExerciseDTO[];
  questions: QuizDTO[];
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(lesson.title);
  const [body, setBody] = useState(lesson.bodyMarkdown);
  const [videoKind, setVideoKind] = useState<"youtube" | "blob">(
    lesson.videoKind === "blob" ? "blob" : "youtube",
  );
  const [youtubeUrl, setYoutubeUrl] = useState(
    lesson.videoKind === "blob" ? "" : lesson.videoUrl ?? "",
  );
  const [blobUrl, setBlobUrl] = useState(
    lesson.videoKind === "blob" ? lesson.videoUrl ?? "" : "",
  );
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/teacher/content/lessons/${lesson.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          bodyMarkdown: body,
          videoKind,
          videoUrl: videoKind === "youtube" ? youtubeUrl : blobUrl,
          blobUrl: videoKind === "blob" ? blobUrl : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Помилка");
      setMessage("Урок збережено.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Помилка");
    } finally {
      setBusy(false);
    }
  }

  async function handleUpload(file: File) {
    setError(null);
    setMessage(null);
    if (file.type !== "video/mp4") {
      setError("Дозволено лише video/mp4.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Файл завеликий (макс. ~50 МБ).");
      return;
    }
    setUploading(true);
    try {
      const safeName = file.name.replace(/[^\w.\-]+/g, "_") || "lesson.mp4";
      const pathname = `lessons/${lesson.id}/${safeName}`;
      const result = await upload(pathname, file, {
        access: "public",
        handleUploadUrl: "/api/teacher/blob/upload",
        contentType: "video/mp4",
        multipart: file.size > 4.5 * 1024 * 1024,
      });
      setBlobUrl(result.url);
      setVideoKind("blob");
      setMessage("Відео завантажено. Натисни «Зберегти урок», щоб застосувати.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не вдалося завантажити відео.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-8" data-testid="lesson-editor">
      <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-lg font-semibold">Основне</h2>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Назва</span>
          <input
            className="w-full rounded-xl border border-zinc-300 px-3 py-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            data-testid="lesson-edit-title"
          />
        </label>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium">Пояснення (Markdown)</span>
            <button
              type="button"
              className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs"
              data-testid="lesson-preview-toggle"
              onClick={() => setPreview((p) => !p)}
            >
              {preview ? "Редагувати" : "Перегляд"}
            </button>
          </div>
          {preview ? (
            <div
              className="min-h-40 rounded-xl border border-zinc-200 bg-zinc-50 p-4"
              data-testid="lesson-preview"
            >
              <Markdown content={body || "_Порожньо_"} />
            </div>
          ) : (
            <textarea
              className="min-h-48 w-full rounded-xl border border-zinc-300 p-3 font-mono text-sm"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              data-testid="lesson-body"
            />
          )}
        </div>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Відео уроку</legend>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Тип відео">
            <label
              className={`cursor-pointer rounded-full border px-4 py-2 text-sm ${
                videoKind === "youtube"
                  ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                  : "border-zinc-300 bg-white text-zinc-700"
              }`}
            >
              <input
                type="radio"
                className="sr-only"
                name="videoKind"
                value="youtube"
                checked={videoKind === "youtube"}
                onChange={() => setVideoKind("youtube")}
                data-testid="lesson-video-kind-youtube"
              />
              YouTube
            </label>
            <label
              className={`cursor-pointer rounded-full border px-4 py-2 text-sm ${
                videoKind === "blob"
                  ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                  : "border-zinc-300 bg-white text-zinc-700"
              }`}
            >
              <input
                type="radio"
                className="sr-only"
                name="videoKind"
                value="blob"
                checked={videoKind === "blob"}
                onChange={() => setVideoKind("blob")}
                data-testid="lesson-video-kind-blob"
              />
              Власне відео (mp4)
            </label>
          </div>
          {/* keep select for older proof scripts / accessibility fallback */}
          <select
            className="sr-only"
            value={videoKind}
            onChange={(e) => setVideoKind(e.target.value as "youtube" | "blob")}
            data-testid="lesson-video-kind"
            aria-hidden
            tabIndex={-1}
          >
            <option value="youtube">YouTube</option>
            <option value="blob">Власне відео (mp4)</option>
          </select>

          {videoKind === "youtube" ? (
            <label className="block space-y-1 text-sm">
              <span className="font-medium">YouTube URL</span>
              <input
                className="w-full rounded-xl border border-zinc-300 px-3 py-2"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=…"
                data-testid="lesson-youtube-url"
              />
            </label>
          ) : (
            <div className="space-y-2">
              <label className="block space-y-1 text-sm">
                <span className="font-medium">Завантажити mp4</span>
                <input
                  ref={fileRef}
                  type="file"
                  accept="video/mp4"
                  className="block w-full text-sm"
                  data-testid="lesson-blob-file"
                  disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleUpload(f);
                  }}
                />
              </label>
              <p className="text-xs text-zinc-500">
                Лише video/mp4, до ~50 МБ. Файл іде напряму в Vercel Blob.
              </p>
              {uploading && (
                <p className="text-sm text-amber-800" data-testid="lesson-blob-uploading">
                  Завантаження…
                </p>
              )}
              {blobUrl ? (
                <label className="block space-y-1 text-sm">
                  <span className="font-medium">Blob URL</span>
                  <input
                    className="w-full rounded-xl border border-zinc-300 px-3 py-2 font-mono text-xs"
                    value={blobUrl}
                    onChange={(e) => setBlobUrl(e.target.value)}
                    data-testid="lesson-blob-url"
                    readOnly
                  />
                </label>
              ) : (
                <p className="text-sm text-zinc-500">Ще немає завантаженого відео.</p>
              )}
            </div>
          )}
        </fieldset>

        {error && (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
        {message && <p className="text-sm text-emerald-700">{message}</p>}
        <button
          type="button"
          disabled={busy || uploading}
          onClick={() => void save()}
          className="rounded-full bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          data-testid="lesson-save"
        >
          {busy ? "Збереження…" : "Зберегти урок"}
        </button>
      </section>

      <ExerciseEditor lessonId={lesson.id} exercises={exercises} />
      <QuizEditor lessonId={lesson.id} questions={questions} />
    </div>
  );
}
