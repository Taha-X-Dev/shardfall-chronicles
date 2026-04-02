import { promises as fs } from "fs";
import path from "path";

const docsDir = path.join(process.cwd(), "src/content/docs");

export type DocMeta = {
  slug: string;
  title: string;
  description: string;
};

const parseFrontmatter = (raw: string) => {
  if (!raw.startsWith("---\n")) {
    return { meta: {} as Record<string, string>, content: raw };
  }

  const end = raw.indexOf("\n---\n", 4);
  if (end === -1) {
    return { meta: {} as Record<string, string>, content: raw };
  }

  const frontmatterBlock = raw.slice(4, end);
  const content = raw.slice(end + 5);
  const meta: Record<string, string> = {};

  for (const line of frontmatterBlock.split("\n")) {
    const sep = line.indexOf(":");
    if (sep === -1) continue;
    const key = line.slice(0, sep).trim();
    const value = line.slice(sep + 1).trim().replace(/^"|"$/g, "");
    if (key) meta[key] = value;
  }

  return { meta, content };
};

export const getDocsList = async (): Promise<DocMeta[]> => {
  const entries = await fs.readdir(docsDir, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".md"));

  const docs = await Promise.all(
    files.map(async (file) => {
      const slug = file.name.replace(/\.md$/, "");
      const fullPath = path.join(docsDir, file.name);
      const raw = await fs.readFile(fullPath, "utf8");
      const { meta } = parseFrontmatter(raw);

      return {
        slug,
        title: meta.title || slug,
        description: meta.description || "",
      };
    }),
  );

  return docs.sort((a, b) => a.title.localeCompare(b.title));
};

export const getDocBySlug = async (slug: string) => {
  const safeSlug = slug.replace(/[^a-zA-Z0-9-_]/g, "");
  const fullPath = path.join(docsDir, `${safeSlug}.md`);
  const raw = await fs.readFile(fullPath, "utf8");
  const { meta, content } = parseFrontmatter(raw);

  return {
    slug: safeSlug,
    title: meta.title || safeSlug,
    description: meta.description || "",
    content,
  };
};
