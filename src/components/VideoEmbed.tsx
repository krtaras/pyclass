import { youtubeEmbedUrl } from "@/lib/youtube";

export function VideoEmbed({
  url,
  kind,
  title,
}: {
  url: string | null;
  kind: "youtube" | "blob" | null;
  title: string;
}) {
  if (!url) return null;

  if (kind === "youtube" || (!kind && url.includes("youtu"))) {
    const embed = youtubeEmbedUrl(url);
    if (!embed) return null;
    return (
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-black shadow-sm">
        <div className="relative aspect-video w-full">
          <iframe
            className="absolute inset-0 h-full w-full"
            src={embed}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-black shadow-sm">
      <video className="aspect-video w-full" controls src={url} title={title} />
    </div>
  );
}
