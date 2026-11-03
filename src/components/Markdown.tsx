import ReactMarkdown from "react-markdown";

export function Markdown({ content }: { content: string }) {
  return (
    <div className="prose-ua space-y-3 text-[15px] leading-relaxed text-zinc-800 sm:text-base">
      <ReactMarkdown
        components={{
          h2: ({ children }) => (
            <h2 className="mt-6 text-xl font-semibold text-zinc-900 first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-4 text-lg font-semibold text-zinc-900">
              {children}
            </h3>
          ),
          p: ({ children }) => <p className="text-zinc-700">{children}</p>,
          ul: ({ children }) => (
            <ul className="list-disc space-y-1 pl-5 text-zinc-700">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal space-y-1 pl-5 text-zinc-700">
              {children}
            </ol>
          ),
          code: ({ className, children }) => {
            const isBlock = Boolean(className);
            if (isBlock) {
              return (
                <code className="block overflow-x-auto rounded-lg bg-zinc-900 p-3 font-mono text-sm text-zinc-100">
                  {children}
                </code>
              );
            }
            return (
              <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[0.9em] text-zinc-800">
                {children}
              </code>
            );
          },
          pre: ({ children }) => <pre className="my-3 overflow-x-auto">{children}</pre>,
          strong: ({ children }) => (
            <strong className="font-semibold text-zinc-900">{children}</strong>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
