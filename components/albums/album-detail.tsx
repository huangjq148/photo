"use client";

import React, { useEffect, useState } from "react";
import { AddPhotosModal } from "@/components/albums/add-photos-modal";
import { AlbumDetailHeader } from "@/components/albums/album-detail-header";
import { AlbumManagementModal } from "@/components/albums/album-management-modal";
import { AlbumShareManager } from "@/components/albums/album-share-manager";
import { PhotoGallery } from "@/components/photos/photo-gallery";
import type { PhotoSize } from "@/components/photos/photo-gallery-size-control";
import { useMessage } from "@/components/ui/message";
import { useUpload } from "@/components/upload/upload-provider";
import {
  loadGalleryPreferences,
  updateGalleryPreferences,
} from "@/lib/client/gallery-preferences";
import { shouldConfirmDisableChildAlbum, validateChildBirthDate } from "@/lib/albums/child-album-rules";

type AlbumDetailData = {
  id: string;
  creatorId: string;
  currentUserId: string;
  name: string;
  description: string | null;
  coverPhotoId: string | null;
  coverUrl: string | null;
  previewUrl: string | null;
  isDefault: boolean;
  isImmutable: boolean;
  isChildAlbum: boolean;
  childBirthDate: string | null;
  photoCount: number;
  memberCount: number;
  role: string;
};

export function AlbumDetailPageError({
  error,
  onReload,
}: {
  error: string;
  onReload: () => void;
}) {
  return (
    <div
      role="alert"
      className="space-y-4 rounded-2xl border border-red-400/30 bg-red-950/30 p-6 text-[var(--danger)]"
    >
      <div>
        <p className="text-base font-bold text-[var(--text)]">相册加载失败</p>
        <p className="mt-2 text-sm leading-6 text-[var(--danger)]">{error}</p>
      </div>
      <button
        type="button"
        onClick={onReload}
        className="inline-flex min-h-11 items-center justify-center rounded-lg border border-red-400/40 px-5 text-sm font-bold text-[var(--text)] transition hover:bg-white/[0.08]"
      >
        重新加载相册
      </button>
    </div>
  );
}

export function AlbumDetail({ albumId }: { albumId: string }) {
  const { openUpload } = useUpload();
  const [album, setAlbum] = useState<AlbumDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editIsChildAlbum, setEditIsChildAlbum] = useState(false);
  const [editChildBirthDate, setEditChildBirthDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showAddPhotos, setShowAddPhotos] = useState(false);
  const [showManagement, setShowManagement] = useState(false);
  const [showShareManager, setShowShareManager] = useState(false);
  const [showTakenAt, setShowTakenAt] = useState(() => loadGalleryPreferences().showTakenAt);
  const [photoSize, setPhotoSize] = useState<PhotoSize>(() => loadGalleryPreferences().photoSize);
  const [refreshToken, setRefreshToken] = useState(0);
  const [photoRefreshToken, setPhotoRefreshToken] = useState(0);
  const message = useMessage();

  useEffect(() => {
    updateGalleryPreferences({ showTakenAt, photoSize });
  }, [photoSize, showTakenAt]);

  async function load({ replaceBody }: { replaceBody: boolean }) {
    if (replaceBody) {
      setLoading(true);
      setLoadError(null);
      setAlbum(null);
    }

    try {
      const response = await fetch(`/api/albums/${albumId}`);
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "Failed to load album");
      }

      setAlbum(json.data);
      setEditName(json.data.name);
      setEditDesc(json.data.description ?? "");
      setEditIsChildAlbum(Boolean(json.data.isChildAlbum));
      setEditChildBirthDate(json.data.childBirthDate ?? "");
      setLoadError(null);
    } catch (err) {
      const text = err instanceof Error ? err.message : "Failed to load album";
      if (replaceBody) {
        setLoadError(text);
      } else {
        message.error(text);
      }
    } finally {
      if (replaceBody) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    void load({ replaceBody: true });
  }, [albumId]);

  useEffect(() => {
    if (refreshToken === 0) {
      return;
    }

    void load({ replaceBody: false });
  }, [refreshToken]);

  async function handleSave() {
    if (!editName.trim()) {
      setFormError("相册名称不能为空");
      return;
    }

    const birthDateError = validateChildBirthDate(editIsChildAlbum, editChildBirthDate);
    if (birthDateError) {
      setFormError(birthDateError);
      message.error(birthDateError);
      window.requestAnimationFrame(() => {
        document.getElementById("child-birth-date-input")?.focus();
      });
      return;
    }

    setFormError(null);
    setSaving(true);
    try {
      const response = await fetch(`/api/albums/${albumId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDesc.trim() || null,
          isChildAlbum: editIsChildAlbum,
          childBirthDate: editIsChildAlbum ? editChildBirthDate || null : null,
        }),
      });
      if (!response.ok) {
        const json = await response.json();
        throw new Error(json.error ?? "Failed to update album");
      }

      message.success("相册资料已保存");
      setRefreshToken((current) => current + 1);
    } catch (err) {
      const text = err instanceof Error ? err.message : "Failed to update album";
      setFormError(text);
      message.error(text);
    } finally {
      setSaving(false);
    }
  }

  function handleEditIsChildAlbumChange(nextValue: boolean) {
    if (shouldConfirmDisableChildAlbum(editIsChildAlbum, nextValue)) {
      const confirmed = window.confirm("关闭孩子相册后，照片上的年龄信息会消失。确定要继续吗？");
      if (!confirmed) {
        return;
      }
    }

    setEditIsChildAlbum(nextValue);

    if (nextValue && !editChildBirthDate.trim()) {
      window.requestAnimationFrame(() => {
        document.getElementById("child-birth-date-input")?.focus();
      });
    }
  }

  async function handleSetCover(photoId: string) {
    try {
      const response = await fetch(`/api/albums/${albumId}/cover`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ photoId }),
      });
      if (!response.ok) {
        const json = await response.json();
        throw new Error(json.error ?? "设置封面失败");
      }

      message.success("封面已更新");
      setRefreshToken((current) => current + 1);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "设置封面失败");
    }
  }

  async function handleDelete() {
    if (!confirm("确定要删除此相册吗？此操作不可撤销。")) return;

    setFormError(null);
    setDeleting(true);
    try {
      const response = await fetch(`/api/albums/${albumId}`, { method: "DELETE" });
      if (!response.ok) {
        const json = await response.json();
        throw new Error(json.error ?? "Failed to delete album");
      }

      window.location.href = "/albums";
    } catch (err) {
      const text = err instanceof Error ? err.message : "Failed to delete album";
      setFormError(text);
      message.error(text);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-[var(--muted)]">
        加载相册...
      </div>
    );
  }

  if (loadError) {
    return <AlbumDetailPageError error={loadError} onReload={() => void load({ replaceBody: true })} />;
  }

  if (!album) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-[var(--muted)]">
        相册不存在
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AlbumDetailHeader
        album={album}
        onUploadNew={() => openUpload({ albumId })}
        onAddFromAllPhotos={() => setShowAddPhotos(true)}
        onManage={() => {
          setFormError(null);
          setEditName(album.name);
          setEditDesc(album.description ?? "");
          setEditIsChildAlbum(album.isChildAlbum);
          setEditChildBirthDate(album.childBirthDate ?? "");
          setShowManagement(true);
        }}
        onShare={() => setShowShareManager(true)}
      />

      <section className="space-y-4">
        <p className="text-sm font-medium text-[var(--film)]">PHOTOS</p>
        <PhotoGallery
          key={photoRefreshToken}
          albumId={albumId}
          albumIsDefault={album.isDefault}
          currentUserId={album.currentUserId}
          refreshSignal={photoRefreshToken}
          onSetCover={(photoId) => {
            void handleSetCover(photoId);
          }}
          showTakenAt={showTakenAt}
          onToggleTakenAt={() => setShowTakenAt((prev) => !prev)}
          photoSize={photoSize}
          onPhotoSizeChange={setPhotoSize}
          childBirthDate={album.childBirthDate}
          isDefaultAlbum={album.isDefault}
        />
      </section>

      <AlbumManagementModal
        open={showManagement}
        albumId={albumId}
        album={album}
        currentUserId={album.currentUserId}
        editName={editName}
        editDesc={editDesc}
        editIsChildAlbum={editIsChildAlbum}
        editChildBirthDate={editChildBirthDate}
        formError={formError}
        saving={saving}
        deleting={deleting}
        onEditNameChange={setEditName}
        onEditDescChange={setEditDesc}
        onEditIsChildAlbumChange={handleEditIsChildAlbumChange}
        onEditChildBirthDateChange={setEditChildBirthDate}
        onSave={() => void handleSave()}
        onDelete={() => void handleDelete()}
        onRefresh={() => setRefreshToken((current) => current + 1)}
        onPhotoUploaded={() => {
          setRefreshToken((current) => current + 1);
          setPhotoRefreshToken((current) => current + 1);
        }}
        showTakenAt={showTakenAt}
        onToggleTakenAt={() => setShowTakenAt((prev) => !prev)}
        photoSize={photoSize}
        onPhotoSizeChange={setPhotoSize}
        onClose={() => setShowManagement(false)}
      />

      <AlbumShareManager
        albumId={albumId}
        open={showShareManager}
        onClose={() => setShowShareManager(false)}
      />

      {showAddPhotos ? (
        <AddPhotosModal
          currentAlbumId={albumId}
          onClose={() => setShowAddPhotos(false)}
          onAdded={() => {
            setRefreshToken((current) => current + 1);
            setPhotoRefreshToken((current) => current + 1);
            message.success("照片已添加");
            setShowAddPhotos(false);
          }}
        />
      ) : null}
    </div>
  );
}
