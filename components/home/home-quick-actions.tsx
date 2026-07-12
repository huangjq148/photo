"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Upload, FolderPlus, Heart, Trash2 } from "lucide-react";
import { CreateAlbumModal } from "@/components/albums/create-album-modal";

const iconClass = "h-6 w-6 text-[var(--film)]";

const actions = [
  { key: "upload", icon: <Upload className={iconClass} />, label: "上传照片", desc: "添加新照片", href: "/albums" as const },
  { key: "album", icon: <FolderPlus className={iconClass} />, label: "新建相册", desc: "创建新相册", href: null },
  { key: "favorites", icon: <Heart className={iconClass} />, label: "我的收藏", desc: "查看收藏的照片", href: "/favorites" as const },
  { key: "trash", icon: <Trash2 className={iconClass} />, label: "回收站", desc: "管理已删除文件", href: "/trash" as const },
];

export function HomeQuickActions() {
  const router = useRouter();
  const [showCreateAlbum, setShowCreateAlbum] = useState(false);
  const [albumName, setAlbumName] = useState("");
  const [albumDescription, setAlbumDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  async function handleCreateAlbum() {
    if (!albumName.trim()) return;

    setCreating(true);
    try {
      const res = await fetch("/api/albums", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: albumName.trim(), description: albumDescription.trim() || undefined }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "创建失败");
      }

      const json = await res.json();
      setMessage({ text: "相册创建成功", type: "success" });
      setShowCreateAlbum(false);
      setAlbumName("");
      setAlbumDescription("");
      router.push(`/albums/${json.data.id}` as `/albums/${string}`);
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "创建失败", type: "error" });
    } finally {
      setCreating(false);
    }
  }

  function handleClick(key: string) {
    if (key === "album") {
      setShowCreateAlbum(true);
    }
  }

  return (
    <>
      <section className="mx-auto max-w-5xl">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {actions.map((action) =>
            action.href ? (
              <Link
                key={action.key}
                href={action.href}
                className="noir-glass-panel flex flex-col items-center gap-3 rounded-2xl p-4 text-center transition hover:-translate-y-0.5 hover:border-[var(--border-strong)] sm:p-5"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full noir-glass-chip">
                  {action.icon}
                </span>
                <p className="text-sm font-bold text-[var(--text)]">{action.label}</p>
                <p className="text-xs text-[var(--muted)]">{action.desc}</p>
              </Link>
            ) : (
              <button
                key={action.key}
                type="button"
                onClick={() => handleClick(action.key)}
                className="noir-glass-panel flex flex-col items-center gap-3 rounded-2xl p-4 text-center transition hover:-translate-y-0.5 hover:border-[var(--border-strong)] sm:p-5"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full noir-glass-chip">
                  {action.icon}
                </span>
                <p className="text-sm font-bold text-[var(--text)]">{action.label}</p>
                <p className="text-xs text-[var(--muted)]">{action.desc}</p>
              </button>
            )
          )}
        </div>
      </section>

      {message ? (
        <div className="fixed right-5 top-5 z-[100] rounded-lg noir-glass-panel-strong px-4 py-3 text-sm text-[var(--text)] shadow-2xl">
          {message.text}
        </div>
      ) : null}

      <CreateAlbumModal
        open={showCreateAlbum}
        name={albumName}
        description={albumDescription}
        creating={creating}
        onNameChange={setAlbumName}
        onDescriptionChange={setAlbumDescription}
        onCreate={handleCreateAlbum}
        onClose={() => {
          setShowCreateAlbum(false);
          setAlbumName("");
          setAlbumDescription("");
        }}
      />
    </>
  );
}
