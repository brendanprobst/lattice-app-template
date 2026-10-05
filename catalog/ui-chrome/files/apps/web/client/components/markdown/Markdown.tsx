"use client";

import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";

type MarkdownProps = {
  children: string;
  className?: string;
};

const heading = "mb-2 block font-semibold tracking-tight first:mt-0";

/**
 * Tailwind's preflight flattens headings, lists, and links, and `prose` is a
 * no-op without the typography plugin. These classes are the stand-in so bios
 * still read as formatted markdown.
 */
const components: Components = {
  h1: ({ children }) => <h1 className={`${heading} mt-4 text-2xl`}>{children}</h1>,
  h2: ({ children }) => <h2 className={`${heading} mt-4 text-xl`}>{children}</h2>,
  h3: ({ children }) => <h3 className={`${heading} mt-3 text-lg`}>{children}</h3>,
  h4: ({ children }) => <h4 className={`${heading} mt-3 text-base`}>{children}</h4>,
  h5: ({ children }) => <h5 className={`${heading} mt-3 text-base`}>{children}</h5>,
  h6: ({ children }) => <h6 className={`${heading} mt-3 text-sm`}>{children}</h6>,
  p: ({ children }) => <p className="mb-2 leading-relaxed last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
  a: ({ href, children }) => (
    <a href={href} className="text-primary underline underline-offset-2">
      {children}
    </a>
  ),
};

/**
 * Plain-markdown renderer for long-form copy (no rich text / BlockNote).
 */
export function Markdown({ children, className }: MarkdownProps) {
  return (
    <div className={className ?? "text-foreground max-w-none"}>
      <ReactMarkdown remarkPlugins={[remarkBreaks]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
