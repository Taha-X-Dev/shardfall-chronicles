import Link from "next/link";
import { getDocsList } from "@/lib/docs";

export default async function DocsPage() {
  const docs = await getDocsList();

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-12">
      <h1 className="text-3xl font-bold">Frontend Docs</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Project documentation rendered from markdown files in
        `src/content/docs`.
      </p>

      <ul className="mt-8 space-y-4">
        {docs.map((doc) => (
          <li
            key={doc.slug}
            className="rounded-xl border border-zinc-200 p-4 transition hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
          >
            <Link href={`/docs/${doc.slug}`} className="text-lg font-semibold">
              {doc.title}
            </Link>
            {doc.description ? (
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {doc.description}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </main>
  );
}
