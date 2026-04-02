import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { getDocBySlug, getDocsList } from "@/lib/docs";

type Params = {
  slug: string;
};

export async function generateStaticParams() {
  const docs = await getDocsList();
  return docs.map((doc) => ({ slug: doc.slug }));
}

export default async function DocDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;

  try {
    const doc = await getDocBySlug(slug);

    return (
      <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-12">
        <Link
          href="/docs"
          className="text-sm text-zinc-600 underline dark:text-zinc-300"
        >
          Back to docs
        </Link>
        <h1 className="mt-4 text-3xl font-bold">{doc.title}</h1>
        {doc.description ? (
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            {doc.description}
          </p>
        ) : null}

        <article className="markdown-content mt-8 max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
          >
            {doc.content}
          </ReactMarkdown>
        </article>
      </main>
    );
  } catch {
    notFound();
  }
}
