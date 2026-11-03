"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Markdown } from "@/components/Markdown";
import { ExerciseEditor, type ExerciseDTO } from "./ExerciseEditor";
import { QuizEditor, type QuizDTO } from "./QuizEditor";

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

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Тип відео</span>
            <select
              className="w-full rounded-xl border border-zinc-300 px-3 py-2"
              value={videoKind}
              onChange={(e) =>
                setVideoKind(e.target.value as "youtube" | "blob")
              }
              data-testid="lesson-video-kind"
            >
              <option value="youtube">YouTube</option>
              <option value="blob">Blob (mp4 / ClipForge)</option>
            </select>
          </label>
          {videoKind === "youtube" ? (
            <label className="block space-y-1 text-sm sm:col-span-1">
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
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Blob mp4 URL</span>
              <input
                className="w-full rounded-xl border border-zinc-300 px-3 py-2"
                value={blobUrl}
                onChange={(e) => setBlobUrl(e.target.value)}
                placeholder="https://….mp4"
                data-testid="lesson-blob-url"
              />
            </label>
          )}
        </div>

        {error && <p className="text-sm text-red-700">{error}</p>}
        {message && <p className="text-sm text-emerald-700">{message}</p>}
        <button
          type="button"
          disabled={busy}
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
