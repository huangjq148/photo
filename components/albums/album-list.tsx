"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlbumCard } from "@/components/albums/album-card";
import { CreateAlbumModal } from "@/components/albums/create-album-modal";
import { useMessage } from "@/components/ui/message";

type AlbumItem = {
  id: string;
  name: string;
  description: string | null;
  coverPhotoId: string | null;
  coverUrl: string | null;
  lastPhotoUrl: string | null;
  isDefault: boolean;
  isImmutable: boolean;
  photoCount: number;
  memberCount: number;
  role: string;
  updatedAt: string;
};

export function AlbumList() {
  const [albums, setAlbums] = useState<AlbumItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const message = useMessage();

  async function load() {
    try {
      setLoading(true);
      const response = await fetch("/api/albums");
      if (response.status === 401) {
        setAuthRequired(true);
        return;
      }
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Failed to load albums");
      setAlbums(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load albums");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createAlbum() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const response = await fetch("/api/albums", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() || undefined }),
      });
      if (!response.ok) {
        const json = await response.json();
        throw new Error(json.error ?? "Failed to create album");
      }
      setNewName("");
      setNewDesc("");
      setShowCreate(false);
      message.success("相册已创建");
      await load();
    } catch (err) {
      const text = err instanceof Error ? err.message : "Failed to create album";
      setError(text);
      message.error(text);
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-[var(--muted)]">
        加载相册...
      </div>
    );
  }

  if (authRequired) {
    return (
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
        <div className="max-w-2xl space-y-5">
          <h2 className="text-3xl font-black text-[var(--text)]">
            请先
            <Link href="/login" className="underline decoration-[var(--accent)] underline-offset-4 hover:text-[var(--accent)]">
              登录
            </Link>
          </h2>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--accent)] px-5 text-sm font-bold text-black"
            >
              去登录
            </Link>
            <Link
              href="/register"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border-strong)] px-5 text-sm font-bold text-[var(--text)]"
            >
              去注册
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-400/30 bg-red-950/30 p-6 text-[var(--danger)]">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <p className="text-sm font-medium text-[var(--film)]">ALBUMS / {albums.length}</p>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[var(--accent)] px-4 text-sm font-bold text-black transition hover:bg-white"
        >
          创建新相册
        </button>
      </div>

      <CreateAlbumModal
        open={showCreate}
        name={newName}
        description={newDesc}
        creating={creating}
        onNameChange={setNewName}
        onDescriptionChange={setNewDesc}
        onCreate={() => void createAlbum()}
        onClose={() => setShowCreate(false)}
      />

      {albums.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-[var(--muted)]">
          暂无相册，创建一个开始吧！
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {albums.map((album) => (
            <AlbumCard
              key={album.id}
              albumId={album.id}
              name={album.name}
              description={album.description}
              coverUrl={album.coverUrl}
              lastPhotoUrl={album.lastPhotoUrl}
              isDefault={album.isDefault}
              isImmutable={album.isImmutable}
              photoCount={album.photoCount}
              memberCount={album.memberCount}
              role={album.role}
              updatedAt={album.updatedAt}
            />
          ))}
        </div>
      )}
    </div>
  );
}
