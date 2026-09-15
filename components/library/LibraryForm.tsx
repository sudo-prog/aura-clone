"use client";

import Editor from "@monaco-editor/react";
import { Plus, Save, Trash2 } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import type { LibraryItem } from "@/lib/library";

type FileEntry = {
  path: string;
  content: string;
};

type Status = {
  tone: "idle" | "success" | "error";
  message: string;
};

const initialFile: FileEntry = {
  path: "components/react/example/App.tsx",
  content: `export default function Example() {\n  return <main className="p-8">Hello from the library</main>\n}\n`,
};

function languageForPath(path: string) {
  if (path.endsWith(".css")) return "css";
  if (path.endsWith(".tsx")) return "typescript";
  if (path.endsWith(".jsx")) return "javascript";
  if (path.endsWith(".ts")) return "typescript";
  if (path.endsWith(".js")) return "javascript";
  if (path.endsWith(".html")) return "html";
  return "plaintext";
}

export function LibraryForm() {
  const [title, setTitle] = useState("");
  const [id, setId] = useState("");
  const [type, setType] = useState<LibraryItem["type"]>("component");
  const [framework, setFramework] = useState<LibraryItem["framework"]>("react");
  const [tagsText, setTagsText] = useState("");
  const [dependenciesText, setDependenciesText] = useState("{}");
  const [sourceUrl, setSourceUrl] = useState("");
  const [stars, setStars] = useState("0");
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<FileEntry[]>([initialFile]);
  const [selectedPath, setSelectedPath] = useState(initialFile.path);
  const [status, setStatus] = useState<Status>({ tone: "idle", message: "" });
  const [saving, setSaving] = useState(false);

  const selectedFile = useMemo(
    () => files.find((file) => file.path === selectedPath) || files[0],
    [files, selectedPath],
  );

  function updateSelectedFile(content: string | undefined) {
    if (!selectedFile) return;
    setFiles((current) =>
      current.map((file) => (file.path === selectedFile.path ? { ...file, content: content || "" } : file)),
    );
  }

  function renameSelectedFile(path: string) {
    if (!selectedFile) return;
    setSelectedPath(path);
    setFiles((current) =>
      current.map((file) => (file.path === selectedFile.path ? { ...file, path } : file)),
    );
  }

  function addFile() {
    const path = `components/${framework}/example/file-${files.length + 1}.${framework === "react" ? "tsx" : "js"}`;
    setFiles((current) => [...current, { path, content: "" }]);
    setSelectedPath(path);
  }

  function removeSelectedFile() {
    if (files.length === 1) return;
    setFiles((current) => current.filter((file) => file.path !== selectedFile?.path));
    setSelectedPath(files.find((file) => file.path !== selectedFile?.path)?.path || files[0].path);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatus({ tone: "idle", message: "" });

    try {
      const dependencies = JSON.parse(dependenciesText || "{}") as Record<string, string>;
      const normalizedId = id.trim() || title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const filesRecord = Object.fromEntries(files.map((file) => [file.path, file.content]));
      const item: LibraryItem = {
        id: normalizedId,
        title: title.trim(),
        type,
        framework,
        tags: tagsText.split(",").map((tag) => tag.trim()).filter(Boolean),
        dependencies,
        ...(sourceUrl ? { sourceUrl } : {}),
        stars: Number(stars) || 0,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        files: filesRecord,
        preview: ["react", "nextjs"].includes(framework) ? "sandpack" : "iframe",
      };

      const response = await fetch("/api/library/items", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ item, message: `Add ${item.title} to the library` }),
      });
      const result = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "GitHub commit failed.");
      }

      setStatus({ tone: "success", message: `${item.title} was committed to the component library.` });
    } catch (error) {
      setStatus({ tone: "error", message: error instanceof Error ? error.message : "Unable to save the item." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400">Metadata</h2>
            <div className="mt-6 grid gap-4">
              <label className="grid gap-2 text-sm text-zinc-300">
                Title
                <input required value={title} onChange={(event) => setTitle(event.target.value)} className="rounded-lg border border-white/10 bg-zinc-950 px-3 py-2.5 outline-none focus:border-white/30" />
              </label>
              <label className="grid gap-2 text-sm text-zinc-300">
                ID <span className="text-zinc-500">optional</span>
                <input value={id} onChange={(event) => setId(event.target.value)} className="rounded-lg border border-white/10 bg-zinc-950 px-3 py-2.5 outline-none focus:border-white/30" />
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="grid gap-2 text-sm text-zinc-300">
                  Type
                  <select value={type} onChange={(event) => setType(event.target.value as LibraryItem["type"])} className="rounded-lg border border-white/10 bg-zinc-950 px-3 py-2.5 outline-none">
                    <option value="component">Component</option>
                    <option value="template">Template</option>
                    <option value="project">Project</option>
                  </select>
                </label>
                <label className="grid gap-2 text-sm text-zinc-300">
                  Framework
                  <select value={framework} onChange={(event) => setFramework(event.target.value as LibraryItem["framework"])} className="rounded-lg border border-white/10 bg-zinc-950 px-3 py-2.5 outline-none">
                    <option value="react">React</option>
                    <option value="nextjs">Next.js</option>
                    <option value="vanilla">Vanilla</option>
                    <option value="webgl">WebGL</option>
                    <option value="html">HTML</option>
                  </select>
                </label>
              </div>
              <label className="grid gap-2 text-sm text-zinc-300">
                Tags <span className="text-zinc-500">comma separated</span>
                <input value={tagsText} onChange={(event) => setTagsText(event.target.value)} placeholder="landing, hero, animation" className="rounded-lg border border-white/10 bg-zinc-950 px-3 py-2.5 outline-none focus:border-white/30" />
              </label>
              <label className="grid gap-2 text-sm text-zinc-300">
                Dependencies <span className="text-zinc-500">JSON</span>
                <textarea value={dependenciesText} onChange={(event) => setDependenciesText(event.target.value)} rows={5} className="rounded-lg border border-white/10 bg-zinc-950 px-3 py-2.5 font-mono text-xs outline-none focus:border-white/30" />
              </label>
              <label className="grid gap-2 text-sm text-zinc-300">
                Source URL
                <input value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} className="rounded-lg border border-white/10 bg-zinc-950 px-3 py-2.5 outline-none focus:border-white/30" />
              </label>
              <label className="grid gap-2 text-sm text-zinc-300">
                Stars
                <input type="number" min="0" value={stars} onChange={(event) => setStars(event.target.value)} className="rounded-lg border border-white/10 bg-zinc-950 px-3 py-2.5 outline-none focus:border-white/30" />
              </label>
              <label className="grid gap-2 text-sm text-zinc-300">
                Notes
                <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={5} className="rounded-lg border border-white/10 bg-zinc-950 px-3 py-2.5 outline-none focus:border-white/30" />
              </label>
            </div>
          </section>
        </div>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400">Source files</h2>
              <p className="mt-1 text-xs text-zinc-500">Files are committed to the private GitHub content repository.</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={addFile} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/10">
                <Plus className="inline h-3.5 w-3.5" /> File
              </button>
              <button type="button" onClick={removeSelectedFile} disabled={files.length === 1} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/10 disabled:opacity-30">
                <Trash2 className="inline h-3.5 w-3.5" /> Remove
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            <label className="grid gap-2 text-sm text-zinc-300">
              File path
              <input value={selectedFile?.path || ""} onChange={(event) => renameSelectedFile(event.target.value)} className="rounded-lg border border-white/10 bg-zinc-950 px-3 py-2.5 font-mono text-xs outline-none focus:border-white/30" />
            </label>
            <select
              value={selectedFile?.path || ""}
              onChange={(event) => setSelectedPath(event.target.value)}
              className="rounded-lg border border-white/10 bg-zinc-950 px-3 py-2.5 text-sm outline-none"
            >
              {files.map((file) => <option key={file.path} value={file.path}>{file.path}</option>)}
            </select>
            <div className="overflow-hidden rounded-xl border border-white/10 bg-zinc-950">
              <Editor
                height="440px"
                language={languageForPath(selectedFile?.path || "")}
                value={selectedFile?.content || ""}
                onChange={updateSelectedFile}
                theme="vs-dark"
                options={{ minimap: { enabled: false }, fontSize: 13, wordWrap: "on" }}
              />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between gap-4">
            <p className={`text-sm ${status.tone === "error" ? "text-red-400" : status.tone === "success" ? "text-emerald-400" : "text-zinc-500"}`}>
              {status.message || "The token stays on the server and is never sent to the browser."}
            </p>
            <button disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-zinc-950 transition hover:bg-zinc-200 disabled:opacity-50">
              <Save className="h-4 w-4" /> {saving ? "Committing..." : "Commit to GitHub"}
            </button>
          </div>
        </section>
      </div>
    </form>
  );
}
