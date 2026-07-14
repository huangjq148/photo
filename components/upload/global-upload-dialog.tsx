"use client";

import React from "react";
import { useMemo } from "react";
import { FolderPlus, Upload } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { CreateAlbumModal } from "@/components/albums/create-album-modal";
import { PhotoUploadForm } from "@/components/upload/photo-upload-form";

export type UploadAlbum = {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  canUpload: boolean;
};

type GlobalUploadDialogProps = {
  open: boolean;
  albums: UploadAlbum[];
  loadingAlbums: boolean;
  loadError: string | null;
  search: string;
  selectedAlbumId: string | null;
  showCreateAlbum: boolean;
  createAlbumName: string;
  createAlbumDescription: string;
  creatingAlbum: boolean;
  onClose: () => void;
  onSearchChange: (value: string) => void;
  onSelectAlbum: (albumId: string) => void;
  onOpenCreateAlbum: () => void;
  onCreateAlbumClose: () => void;
  onCreateAlbumNameChange: (value: string) => void;
  onCreateAlbumDescriptionChange: (value: string) => void;
  onCreateAlbum: () => void;
};

function matchesSearch(album: UploadAlbum, keyword: string) {
  const q = keyword.trim().toLowerCase();
  if (!q) return true;
  return album.name.toLowerCase().includes(q) || album.description?.toLowerCase().includes(q) === true;
}

export function GlobalUploadDialog({
  open,
  albums,
  loadingAlbums,
  loadError,
  search,
  selectedAlbumId,
  showCreateAlbum,
  createAlbumName,
  createAlbumDescription,
  creatingAlbum,
  onClose,
  onSearchChange,
  onSelectAlbum,
  onOpenCreateAlbum,
  onCreateAlbumClose,
  onCreateAlbumNameChange,
  onCreateAlbumDescriptionChange,
  onCreateAlbum,
}: GlobalUploadDialogProps) {
  const visibleAlbums = useMemo(
    () => albums.filter((album) => matchesSearch(album, search)),
    [albums, search]
  );
  const selectedAlbum = selectedAlbumId ? albums.find((album) => album.id === selectedAlbumId) ?? null : null;

  return (
    <>
      <Modal
        open={open}
        size="xl"
        title="上传照片"
        description="选择目标相册后开始上传文件"
        onClose={onClose}
      >
        <div className="space-y-5">
          <section className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)]/70 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--text)]">目标相册</p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  媒体会先进入“全部照片”，并同时添加到这里
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenCreateAlbum}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[var(--border-strong)] px-4 text-sm font-bold text-[var(--text)] transition hover:border-white/35 hover:bg-white/[0.08]"
              >
                <FolderPlus aria-hidden="true" size={16} />
                新建相册
              </button>
            </div>

            <label className="block">
              <span className="sr-only">搜索可上传相册</span>
              <input
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="搜索相册"
                className="h-11 w-full rounded-lg border border-[var(--border)] bg-black px-4 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--film)]"
              />
            </label>

            {loadingAlbums ? (
              <p className="text-sm text-[var(--muted)]">加载可上传相册...</p>
            ) : loadError ? (
              <p className="text-sm text-[var(--danger)]">{loadError}</p>
            ) : visibleAlbums.length === 0 ? (
              <div className="rounded-xl border border-[var(--border)] bg-black/40 p-4 text-sm text-[var(--muted)]">
                没有可用相册，或者没有匹配的搜索结果。
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {visibleAlbums.map((album) => {
                  const selected = album.id === selectedAlbumId;
                  return (
                    <button
                      key={album.id}
                      type="button"
                      onClick={() => onSelectAlbum(album.id)}
                      className={`rounded-xl border px-4 py-3 text-left transition ${
                        selected
                          ? "border-[var(--accent)] bg-[var(--accent)]/10"
                          : "border-[var(--border)] bg-black/50 hover:border-white/30"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-bold text-[var(--text)]">{album.name}</span>
                        {album.isDefault ? (
                          <span className="rounded-full border border-[var(--film)] px-2 py-0.5 text-[10px] text-[var(--film)]">
                            默认
                          </span>
                        ) : null}
                      </div>
                      {album.description ? (
                        <p className="mt-1 line-clamp-2 text-xs text-[var(--muted)]">{album.description}</p>
                      ) : (
                        <p className="mt-1 text-xs text-[var(--muted)]">可上传</p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {selectedAlbum ? (
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-[var(--text)]">
                <Upload aria-hidden="true" size={16} />
                {selectedAlbum.name}
              </div>
              <PhotoUploadForm albumId={selectedAlbum.id} />
            </section>
          ) : (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 text-sm text-[var(--muted)]">
              先选择一个可上传相册。
            </div>
          )}
        </div>
      </Modal>

      <CreateAlbumModal
        open={showCreateAlbum}
        name={createAlbumName}
        description={createAlbumDescription}
        creating={creatingAlbum}
        onNameChange={onCreateAlbumNameChange}
        onDescriptionChange={onCreateAlbumDescriptionChange}
        onCreate={onCreateAlbum}
        onClose={onCreateAlbumClose}
      />
    </>
  );
}
