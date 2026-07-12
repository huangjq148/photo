"use client";

import { useEffect, useState } from "react";
import { AddPhotosModal } from "@/components/albums/add-photos-modal";
import { AlbumDetailHeader } from "@/components/albums/album-detail-header";
import { AlbumManagementModal } from "@/components/albums/album-management-modal";
import { AlbumShareManager } from "@/components/albums/album-share-manager";
import { PhotoGallery } from "@/components/photos/photo-gallery";
import { shouldConfirmDisableChildAlbum, validateChildBirthDate } from "@/lib/albums/child-album-rules";
import type { PhotoSize } from "@/components/photos/photo-gallery-size-control";
import { useMessage } from "@/components/ui/message";

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

export function AlbumDetail({ albumId }: { albumId: string }) {
  const [album, setAlbum] = useState<AlbumDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editIsChildAlbum, setEditIsChildAlbum] = useState(false);
  const [editChildBirthDate, setEditChildBirthDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showAddPhotos, setShowAddPhotos] = useState(false);
  const [showManagement, setShowManagement] = useState(false);
  const [showShareManager, setShowShareManager] = useState(false);
  const [showTakenAt, setShowTakenAt] = useState(false);
  const [photoSize, setPhotoSize] = useState<PhotoSize>("medium");
  const [refreshToken, setRefreshToken] = useState(0);
  const [photoRefreshToken, setPhotoRefreshToken] = useState(0);
  const message = useMessage();

  async function load() {
    try {
      const response = await fetch(`/api/albums/${albumId}`);
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Failed to load album");

      setAlbum(json.data);
      setEditName(json.data.name);
      setEditDesc(json.data.description ?? "");
      setEditIsChildAlbum(!!json.data.isChildAlbum);
      setEditChildBirthDate(json.data.childBirthDate ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load album");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [albumId, refreshToken]);

  async function handleSave() {
    if (!editName.trim()) return;
    const birthDateError = validateChildBirthDate(editIsChildAlbum, editChildBirthDate);
    if (birthDateError) {
      setError(birthDateError);
      message.error(birthDateError);
      window.requestAnimationFrame(() => {
        document.getElementById("child-birth-date-input")?.focus();
      });
      return;
    }
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
      setError(text);
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
    setDeleting(true);
    try {
      const response = await fetch(`/api/albums/${albumId}`, { method: "DELETE" });
      if (!response.ok) {
        const json = await response.json();
        throw new Error(json.error ?? "Failed to delete album");
      }
      window.location.href = "/albums";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete album");
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

  if (error) {
    return (
      <div className="rounded-2xl border border-red-400/30 bg-red-950/30 p-6 text-[var(--danger)]">
        {error}
      </div>
    );
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
        onAddPhotos={() => setShowAddPhotos(true)}
        onManage={() => {
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
          refreshSignal={photoRefreshToken}
          onSetCover={(photoId) => { void handleSetCover(photoId); }}
          showTakenAt={showTakenAt}
          onToggleTakenAt={() => setShowTakenAt((prev) => !prev)}
          photoSize={photoSize}
          onPhotoSizeChange={setPhotoSize}
          childBirthDate={album.childBirthDate}
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
          albumId={albumId}
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
