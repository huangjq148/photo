"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { AlbumInviteForm } from "@/components/albums/album-invite-form";
import { AlbumInviteList } from "@/components/albums/album-invite-list";
import { AlbumMembers } from "@/components/albums/album-members";
import { PhotoUploadForm } from "@/components/upload/photo-upload-form";

type ManageTab = "details" | "upload" | "members";

type ManageAlbum = {
  name: string;
  description: string | null;
  isImmutable: boolean;
  role: string;
};

type AlbumManagementModalProps = {
  open: boolean;
  albumId: string;
  album: ManageAlbum;
  currentUserId: string;
  editName: string;
  editDesc: string;
  saving: boolean;
  deleting: boolean;
  onEditNameChange: (value: string) => void;
  onEditDescChange: (value: string) => void;
  onSave: () => void;
  onDelete: () => void;
  onRefresh: () => void;
  onPhotoUploaded?: () => void;
  onClose: () => void;
};

const tabs: { id: ManageTab; label: string }[] = [
  { id: "details", label: "编辑资料" },
  { id: "upload", label: "上传照片" },
  { id: "members", label: "成员管理" },
];

export function AlbumManagementModal({
  open,
  albumId,
  album,
  currentUserId,
  editName,
  editDesc,
  saving,
  deleting,
  onEditNameChange,
  onEditDescChange,
  onSave,
  onDelete,
  onRefresh,
  onPhotoUploaded,
  onClose,
}: AlbumManagementModalProps) {
  const [activeTab, setActiveTab] = useState<ManageTab>("details");

  return (
    <Modal
      open={open}
      size="xl"
      title="管理相册"
      description={album.name}
      onClose={onClose}
    >
      <div className="space-y-5">
        <nav className="flex gap-1 overflow-x-auto rounded-xl border border-[var(--border)] bg-black p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`min-h-10 rounded-lg px-4 text-sm font-medium transition ${
                activeTab === tab.id
                  ? "bg-[var(--accent)] text-black"
                  : "text-[var(--muted)] hover:bg-white/[0.08] hover:text-[var(--text)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {activeTab === "details" ? (
          <div className="space-y-5">
            {album.isImmutable ? (
              <div className="rounded-xl border border-[var(--border)] bg-black px-4 py-3 text-sm text-[var(--muted)]">
                这个相册是系统默认相册，名称和描述不可编辑。
              </div>
            ) : (
              <div className="space-y-4">
                <label className="block">
                  <span className="text-sm font-medium text-[var(--muted-strong)]">相册名称</span>
                  <input
                    value={editName}
                    onChange={(event) => onEditNameChange(event.target.value)}
                    className="mt-2 h-11 w-full rounded-lg border border-[var(--border)] bg-black px-4 text-[var(--text)] outline-none focus:border-[var(--film)]"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-[var(--muted-strong)]">描述</span>
                  <textarea
                    value={editDesc}
                    onChange={(event) => onEditDescChange(event.target.value)}
                    rows={3}
                    placeholder="描述（可选）"
                    className="mt-2 w-full resize-none rounded-lg border border-[var(--border)] bg-black px-4 py-3 text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--film)]"
                  />
                </label>
                <button
                  type="button"
                  onClick={onSave}
                  disabled={saving || !editName.trim()}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--accent)] px-5 text-sm font-bold text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "保存中..." : "保存资料"}
                </button>
              </div>
            )}

            {!album.isImmutable && album.role === "owner" ? (
              <div className="rounded-xl border border-red-400/25 bg-red-950/20 p-4">
                <p className="text-sm font-medium text-[var(--danger)]">危险操作</p>
                <p className="mt-1 text-sm text-[var(--muted)]">删除相册不会删除照片，但会移除这个相册的组织关系。</p>
                <button
                  type="button"
                  onClick={onDelete}
                  disabled={deleting}
                  className="mt-3 inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--danger)] px-5 text-sm font-bold text-black transition hover:opacity-85 disabled:opacity-50"
                >
                  {deleting ? "删除中..." : "删除相册"}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {activeTab === "upload" ? (
          <div className="space-y-3">
            <PhotoUploadForm albumId={albumId} onUploaded={onPhotoUploaded} />
            <p className="text-sm text-[var(--muted)]">
              上传的照片将进入你的&quot;全部照片&quot;相册，并自动添加到当前相册。
            </p>
          </div>
        ) : null}

        {activeTab === "members" ? (
          <div className="space-y-5">
            {album.role === "owner" ? (
              <>
                <AlbumInviteForm albumId={albumId} onRefresh={onRefresh} />
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                  <p className="text-sm font-medium text-[var(--muted-strong)]">待处理邀请</p>
                  <div className="mt-3">
                    <AlbumInviteList albumId={albumId} refreshToken={0} onRefresh={onRefresh} />
                  </div>
                </div>
              </>
            ) : null}
            <AlbumMembers albumId={albumId} currentUserId={currentUserId} currentRole={album.role} onRefresh={onRefresh} />
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
