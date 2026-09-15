import "server-only";
import { revalidateTag, unstable_cache } from "next/cache";
import { createGitHubClient, getGitHubRepoConfig, type GitHubRepoConfig } from "./github";

export type LibraryItem = {
  id: string;
  title: string;
  type: "template" | "component" | "project";
  framework: "react" | "nextjs" | "vanilla" | "webgl" | "html";
  tags: string[];
  dependencies: Record<string, string>;
  sourceUrl?: string;
  stars?: number;
  notes?: string;
  files: Record<string, string>;
  preview?: "sandpack" | "iframe";
  screenshotUrl?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type LibraryIndex = {
  version: number;
  items: LibraryItem[];
};

export type LibraryFileInput = {
  path: string;
  content: string;
};

export type LibraryFilters = {
  q?: string;
  tag?: string;
  framework?: string;
  type?: string;
};

type GitHubContentItem = {
  name: string;
  path: string;
  type: "file" | "dir" | "submodule";
  sha?: string;
  content?: string;
  encoding?: "base64";
};

const allowedRoots = ["templates", "components", "projects", "assets", "index.json"];

export function normalizeRepoPath(input: string) {
  const trimmed = input.trim().replace(/^\/+|\/+$/g, "");
  const segments = trimmed.split("/").filter(Boolean);

  if (
    segments.some((segment) => segment === ".." || segment.includes("\\") || segment.includes("\0"))
  ) {
    throw new Error("Invalid repository path.");
  }

  const normalized = segments.join("/");

  if (
    normalized !== "index.json" &&
    !allowedRoots.some((root) => normalized === root || normalized.startsWith(`${root}/`))
  ) {
    throw new Error("Repository paths must stay inside templates, components, projects, or assets.");
  }

  return normalized;
}

function decodeGitHubFile(item: GitHubContentItem) {
  if (!item.content) {
    return "";
  }

  return Buffer.from(item.content.replace(/\s/g, ""), "base64").toString("utf8");
}

async function getContent(config: GitHubRepoConfig, path: string) {
  const response = await createGitHubClient(config).rest.repos.getContent({
    owner: config.owner,
    repo: config.repo,
    path,
    ref: config.branch,
  });

  return response.data as GitHubContentItem | GitHubContentItem[];
}

async function fetchIndex(config: GitHubRepoConfig) {
  const data = await getContent(config, "index.json");

  if (Array.isArray(data) || data.type !== "file") {
    throw new Error("index.json was not found in the component library repository.");
  }

  const parsed = JSON.parse(decodeGitHubFile(data)) as Partial<LibraryIndex>;

  if (!Array.isArray(parsed.items)) {
    throw new Error("index.json must contain an items array.");
  }

  return {
    version: parsed.version ?? 1,
    items: parsed.items.filter((item): item is LibraryItem => Boolean(item?.id && item?.files)),
  };
}

export const getCachedLibraryIndex = unstable_cache(
  async (owner: string, repo: string, branch: string) => {
    return fetchIndex({
      token: process.env.GITHUB_TOKEN || "",
      owner,
      repo,
      branch,
    });
  },
  ["component-library-index"],
  {
    revalidate: 300,
    tags: ["component-library-index"],
  },
);

export async function getLibraryIndex() {
  const config = getGitHubRepoConfig();
  return getCachedLibraryIndex(config.owner, config.repo, config.branch);
}

export async function listLibraryItems(filters: LibraryFilters = {}) {
  const index = await getLibraryIndex();
  const query = filters.q?.trim().toLowerCase() || "";
  const tag = filters.tag?.trim().toLowerCase() || "";
  const framework = filters.framework?.trim().toLowerCase() || "";
  const type = filters.type?.trim().toLowerCase() || "";

  return index.items.filter((item) => {
    const searchable = [
      item.id,
      item.title,
      item.type,
      item.framework,
      item.notes,
      item.sourceUrl,
      ...item.tags,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return (
      (!query || searchable.includes(query)) &&
      (!tag || item.tags.some((value) => value.toLowerCase() === tag)) &&
      (!framework || item.framework.toLowerCase() === framework) &&
      (!type || item.type.toLowerCase() === type)
    );
  });
}

export async function fetchLibraryFile(path: string) {
  const config = getGitHubRepoConfig();
  const normalized = normalizeRepoPath(path);
  const data = await getContent(config, normalized);

  if (Array.isArray(data) || data.type !== "file") {
    throw new Error(`${normalized} is not a file.`);
  }

  return decodeGitHubFile(data);
}

export async function getLibraryItem(id: string) {
  const index = await getLibraryIndex();
  const item = index.items.find((candidate) => candidate.id === id);

  if (!item) {
    throw new Error("Library item was not found.");
  }

  const files = Object.entries(item.files);
  const resolvedFiles = await Promise.all(
    files.map(async ([name, path]) => [name, await fetchLibraryFile(path)] as const),
  );

  return {
    ...item,
    files: Object.fromEntries(resolvedFiles),
  };
}

export async function getRepositoryEntry(path: string) {
  const config = getGitHubRepoConfig();
  const normalized = normalizeRepoPath(path);
  const data = await getContent(config, normalized);

  if (Array.isArray(data)) {
    return {
      type: "directory" as const,
      path: normalized,
      entries: data.map((entry) => ({
        name: entry.name,
        path: entry.path,
        type: entry.type === "dir" ? "directory" : "file",
      })),
    };
  }

  if (data.type === "file") {
    return {
      type: "file" as const,
      path: normalized,
      content: decodeGitHubFile(data),
      sha: data.sha,
    };
  }

  throw new Error(`${normalized} is not a file or directory.`);
}

export async function commitLibraryFiles(files: LibraryFileInput[], message: string) {
  if (!files.length) {
    throw new Error("At least one file is required.");
  }

  const config = getGitHubRepoConfig();
  const client = createGitHubClient(config);

  for (const file of files) {
    const path = normalizeRepoPath(file.path);
    let sha: string | undefined;

    try {
      const current = await getContent(config, path);
      if (!Array.isArray(current) && current.type === "file") {
        sha = current.sha;
      }
    } catch (error) {
      if ((error as { status?: number }).status !== 404) {
        throw error;
      }
    }

    await client.rest.repos.createOrUpdateFileContents({
      owner: config.owner,
      repo: config.repo,
      branch: config.branch,
      path,
      message,
      content: Buffer.from(file.content, "utf8").toString("base64"),
      ...(sha ? { sha } : {}),
    });
  }
}

export async function upsertLibraryItem(item: LibraryItem, message?: string) {
  if (!item.id.trim()) {
    throw new Error("Library item id is required.");
  }

  const normalizedItem: LibraryItem = {
    ...item,
    id: item.id.trim(),
    title: item.title.trim(),
    tags: [...new Set(item.tags.map((tag) => tag.trim()).filter(Boolean))],
    dependencies: item.dependencies ?? {},
    files: item.files,
  };

  const fileEntries = Object.entries(normalizedItem.files);

  if (!fileEntries.length) {
    throw new Error("At least one source file is required.");
  }

  await commitLibraryFiles(
    fileEntries.map(([path, content]) => ({ path, content })),
    message || `Add ${normalizedItem.title} to the library`,
  );

  const index = await getLibraryIndex();
  const now = new Date().toISOString();
  const nextItem = {
    ...normalizedItem,
    createdAt: normalizedItem.createdAt || now,
    updatedAt: now,
  };
  const items = index.items.some((candidate) => candidate.id === nextItem.id)
    ? index.items.map((candidate) => (candidate.id === nextItem.id ? nextItem : candidate))
    : [...index.items, nextItem];

  await commitLibraryFiles(
    [
      {
        path: "index.json",
        content: `${JSON.stringify({ version: index.version || 1, items }, null, 2)}\n`,
      },
    ],
    `Update library index for ${nextItem.title}`,
  );

  revalidateTag("component-library-index", "full");

  return nextItem;
}
